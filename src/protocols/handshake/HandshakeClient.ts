import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol/MiniProtocol";
import { Multiplexer } from "../../multiplexer";
import { isVersionTableMap, normalizeVersionTableMap, VersionTableMap } from "./HandshakeVersionTable/HandshakeVersionTable";
import { IVersionData, VersionData } from "./HandshakeVersionTable/VersionData";
import { VersionNumber } from "./HandshakeVersionTable/VersionNumber";
import { HandshakeAcceptVersion } from "./messages/HandshakeAcceptVersion";
import { HandshakeMessage, handshakeMessageFromCborObj, isHandshakeMessage } from "./messages/HandshakeMessage";
import { HandshakeProposeVersion } from "./messages/HandshakeProposeVersion";
import { HandshakeQueryReply } from "./messages/HandshakeQueryReply";
import { HandshakeRefuse } from "./messages/HandshakeRefuse";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { NetworkMagic } from "./HandshakeVersionTable";


type HandshakeClientEvtName     = keyof Omit<HandshakeClientEvtListeners, "error">;
type AnyHandshakeClientEvtName  = HandshakeClientEvtName | "error";

type HandshakeClientEvtListeners = {
    propose     : HandshakeClientEvtListener[],
    accept      : HandshakeClientEvtListener[],
    refuse      : HandshakeClientEvtListener[],
    queryReply  : HandshakeClientEvtListener[],
    error       : (( err: Error ) => void)[]
};

type HandshakeClientEvtListener     = ( msg: HandshakeMessage ) => void;
type AnyHandshakeClientEvtListener  = HandshakeClientEvtListener | (( err: Error ) => void);

type MsgOf<EvtName extends AnyHandshakeClientEvtName> =
    EvtName extends "propose"       ? HandshakeProposeVersion   : 
    EvtName extends "accept"        ? HandshakeAcceptVersion    :
    EvtName extends "refuse"        ? HandshakeRefuse           :
    EvtName extends "queryReply"    ? HandshakeQueryReply       :
    EvtName extends "error"         ? Error                     :
    never;

function msgToName( msg: HandshakeMessage ): HandshakeClientEvtName | undefined
{
    if( msg instanceof HandshakeProposeVersion )        return "propose";
    if( msg instanceof HandshakeAcceptVersion )         return "accept";
    if( msg instanceof HandshakeRefuse )                return "refuse";
    if( msg instanceof HandshakeQueryReply )            return "queryReply";
    
    return undefined;
}

function isAnyHandshakeClientEvtName( str: any ): str is AnyHandshakeClientEvtName
{
    return isHandshakeClientEvtName( str ) || str === "error";
}
function isHandshakeClientEvtName( str: any ): str is HandshakeClientEvtName
{
    return (
        str === "propose"       ||
        str === "accept"        ||
        str === "refuse"        ||
        str === "queryReply"
    );
}

type EvtListenerOf<EvtName extends AnyHandshakeClientEvtName> =
    EvtName extends "propose"       ? ( msg: HandshakeProposeVersion )  => void :
    EvtName extends "accept"        ? ( msg: HandshakeAcceptVersion )   => void :
    EvtName extends "refuse"        ? ( msg: HandshakeRefuse )          => void :
    EvtName extends "queryReply"    ? ( msg: HandshakeQueryReply )      => void :
    EvtName extends "error"         ? ( err: Error )                    => void :
    never;


const mplexerHeader = Object.freeze({
    hasAgency: true,
    protocol: MiniProtocol.Handshake
});

export class HandshakeClient
{
    readonly mplexer: Multiplexer;

    private _mplexerListener: undefined | ((chunk: Uint8Array) => void) = undefined;

    /**
     * removes the listener on the multiplexer added on contructor call
     * 
     * after this method is called, the instance is useless.
     **/
    terminate(): void
    {
        this.clearListeners();
        if( typeof this._mplexerListener === "function" )
        {
            this.mplexer.off( MiniProtocol.Handshake, this._mplexerListener );
        }
        this._mplexerListener = undefined;
    }

    constructor(
        multiplexer: Multiplexer
    )
    {
        const self = this;

        this.mplexer = multiplexer;

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: HandshakeMessage[] = [];

        this._mplexerListener = (chunk: Uint8Array) => {
            console.log( "HandshakeClient::_mplexerListener has event listeners: ", self.hasEventListeners() );
            if( !self.hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: HandshakeMessage;

            // const dbg_chunk = Uint8Array.prototype.slice.call( chunk );
            // const dbg_prev = prevBytes ? Uint8Array.prototype.slice.call( prevBytes ) : prevBytes;

            if( prevBytes )
            {
                console.log("prevBytes");
                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( offset < chunk.length )
            {
                const originalSTLimit = Error.stackTraceLimit;
                Error.stackTraceLimit = 0;
                try {
                    thing = Cbor.parseWithOffset( chunk );
                }
                catch
                {
                    console.log("fail parse")
                    Error.stackTraceLimit = originalSTLimit;
                    // assume the error is of "missing bytes";
                    prevBytes = Uint8Array.prototype.slice.call( chunk );
                    break;
                }
                // finally {
                //     Error.stackTraceLimit = originalSTLimit;
                // }

                offset = thing.offset;

                try {
                    msg = handshakeMessageFromCborObj( thing.parsed );
                    
                    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
                    msg.cborBytes = Uint8Array.prototype.slice.call( chunk, 0, offset );

                    queque.unshift( msg );
                }
                catch (e)
                {
                    console.log("fail message creation")
                    // before dispatch event
                    Error.stackTraceLimit = originalSTLimit;

                    // console.error("-------------------------------------------------------");
                    // console.error( "dbg_chunk", toHex( dbg_chunk ) );
                    // console.error( "dbg_prev", dbg_prev ? toHex( dbg_prev ) : dbg_prev );
                    // console.error("-------------------------------------------------------");
                    const err = new Error(
                        (typeof e?.message === "string" ? e.message : "") +
                        "\ndata: " + toHex( chunk ) + "\n"
                    );
                    
                    self.dispatchEvent("error", err );
                }
                finally {
                    Error.stackTraceLimit = originalSTLimit;
                }

                
                if( offset < chunk.length )
                {
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );
                    offset = -1;
                }
            }

            console.log({ queque });
            let msgStr: HandshakeClientEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                self.dispatchEvent( msgStr, msg );
            }

        };

        multiplexer.on( MiniProtocol.Handshake, this._mplexerListener );
    }

    propose(
        /** @default versionTable defaults to all the known versions (depending by n2n or n2c) */
        arg?: VersionTableMap | IVersionData | VersionData | NetworkMagic
    ): Promise<HandshakeAcceptVersion | HandshakeRefuse | HandshakeQueryReply>
    {
        const self = this;
        const isN2N = self.mplexer.isN2N;
        const versionTable = normalizeProposeArg( arg, isN2N );

        return new Promise( async (resolve) => {
            function handleAll( msg: HandshakeAcceptVersion | HandshakeRefuse | HandshakeQueryReply ): void
            {
                self.off("accept", handleAll );
                self.off("refuse", handleAll );
                self.off("queryReply", handleAll );
                resolve( msg );
            }

            self.on("accept", handleAll );
            self.on("refuse", handleAll );
            self.on("queryReply", handleAll );

            this.mplexer.send(
                new HandshakeProposeVersion(
                    { versionTable },
                    this.mplexer.isN2N
                ).toCbor().toBuffer(),
                mplexerHeader
            );
        });
    }

    private readonly _listeners: HandshakeClientEvtListeners = {
        propose     : [],
        accept      : [],
        refuse      : [],
        queryReply  : [],
        error       : []
    };

    private readonly _onceListeners: HandshakeClientEvtListeners = {
        propose     : [],
        accept      : [],
        refuse      : [],
        queryReply  : [],
        error       : []
    };

    hasEventListeners( includeError: boolean = false ): boolean
    {
        return  (
            includeError ? (
                this._listeners.error.length             > 0 ||
                this._onceListeners.error.length         > 0
            ) : true
        ) && (
            this._listeners.propose.length     > 0 ||
            this._listeners.accept.length       > 0 ||
            this._listeners.refuse.length    > 0 ||
            this._listeners.queryReply.length > 0 ||
            this._listeners.error.length        > 0 ||

            this._onceListeners.propose.length     > 0 ||
            this._onceListeners.accept.length       > 0 ||
            this._onceListeners.refuse.length    > 0 ||
            this._onceListeners.queryReply.length > 0 ||
            this._onceListeners.error.length > 0
        );
    }

    clearListeners( evt?: HandshakeClientEvtName ): this
    {
        if( isAnyHandshakeClientEvtName( evt ) )
        {
            this._listeners[evt].length = 0;
            this._onceListeners[evt].length = 0;
            return this;
        }
        this._listeners.propose.length      = 0;
        this._listeners.accept.length       = 0;
        this._listeners.refuse.length       = 0;
        this._listeners.queryReply.length   = 0;
        this._listeners.error.length        = 0;

        this._onceListeners.propose.length      = 0;
        this._onceListeners.accept.length       = 0;
        this._onceListeners.refuse.length       = 0;
        this._onceListeners.queryReply.length   = 0;
        this._onceListeners.error.length        = 0;

        return this;
    }
    removeAllListeners( evt?: HandshakeClientEvtName ): this
    {
        return this.clearListeners( evt );
    }

    once( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener ): this
    {
        if( !isAnyHandshakeClientEvtName( evt ) ) return this;

        this._onceListeners[ evt ].push( listener as any );
        return this;
    }
    addEventListenerOnce( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener ): this
    {
        return this.once( evt, listener );
    }

    on( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener, opts?: AddEvtListenerOpts ): this
    {
        if( opts?.once === true ) return this.addEventListenerOnce( evt, listener );
        
        if( !isAnyHandshakeClientEvtName( evt ) ) return this;
        
        this._listeners[ evt ].push( listener as any );
        return this;
    }
    addEventListener( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener ): this
    {
        return this.on( evt, listener );
    }
    addListener( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener ): this
    {
        return this.on( evt, listener );
    }

    off( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener ): this
    {
        if( !isAnyHandshakeClientEvtName( evt ) ) return this;

        this._listeners[evt] = this._listeners[evt].filter( fn => fn !== listener ) as any;
        this._onceListeners[evt] = this._onceListeners[evt].filter( fn => fn !== listener ) as any;
        return this; 
    }
    removeEventListener( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener ): this
    {
        return this.off( evt, listener );
    }
    removeListener( evt: HandshakeClientEvtName, listener: AnyHandshakeClientEvtListener ): this
    {
        return this.off( evt, listener );
    }

    dispatchEvent( evt: AnyHandshakeClientEvtName, msg: HandshakeMessage | Error ): boolean
    {
        if( !isAnyHandshakeClientEvtName( evt ) ) return true;
        if( evt !== "error" && !isHandshakeMessage( msg ) ) return true;

        const listeners = this._listeners[ evt ];
        const nListeners = listeners.length;
        for(let i = 0; i < nListeners; i++)
        {
            listeners[i](msg as any);
        }

        const onceListeners = this._onceListeners[evt];

        if( evt === "error" && nListeners + onceListeners.length === 0 )
        {
            throw msg instanceof Error ? msg : new Error( "Unhandled error: " + msg );
        }

        while( onceListeners.length > 0 )
        {
            onceListeners.shift()!(msg as any);
        }

        return true;
    }
    emit( evt: AnyHandshakeClientEvtName, msg: HandshakeMessage | Error ): boolean
    {
        return this.dispatchEvent( evt, msg );
    }
}

function normalizeProposeArg(
    arg: VersionTableMap | IVersionData | undefined | NetworkMagic,
    isN2N: boolean
): VersionTableMap
{
    if( typeof arg === "number" ) return normalizeProposeArg({ networkMagic: arg }, isN2N );
    if( isVersionTableMap( arg ) ) return normalizeVersionTableMap( arg );

    const allVersions: VersionNumber[] = isN2N ? [
        7, 8, 9, 10, 11, 12, 13, 14
    ] : [
        16, 17, 18, 19
    ];

    const versionData = arg === undefined ? VersionData.mainnet() : (
        arg instanceof VersionData ? arg.clone() :
            new VersionData( arg, {
                includePeerSharing: isN2N,
                includeQuery: true,
            })
    );

    const result: VersionTableMap = {};

    for( const version of allVersions )
    {
        result[ version ] = versionData.clone();
    }

    return normalizeVersionTableMap( result );
}