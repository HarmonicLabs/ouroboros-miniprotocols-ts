import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IChainPoint } from "../types/ChainPoint";
import { ChainSyncMessage, chainSyncMessageFromCborObj, isChainSyncMessage } from "./ChainSyncMessage";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { ErrorListener } from "../../common/ErrorListener";
import { ChainSyncRollBackwards, ChainSyncRollForward, ChainSyncIntersectFound, ChainSyncIntersectNotFound, ChainSyncAwaitReply, ChainSyncRequestNext, ChainSyncFindIntersect, ChainSyncMessageDone } from "./messages";

const roDescr = Object.freeze({
    writable: false,
    enumerable: true,
    configurable: false
});

type ChainSyncClientEvtListener = ( msg: ChainSyncMessage ) => void;
type AnyChainSyncClientEvtListener = ChainSyncClientEvtListener | (( err: Error ) => void);

type ChainSyncClientEvtListeners = {
    rollBackwards: ChainSyncClientEvtListener[]
    rollForward: ChainSyncClientEvtListener[]
    intersectFound: ChainSyncClientEvtListener[]
    intersectNotFound: ChainSyncClientEvtListener[]
    awaitReply: ChainSyncClientEvtListener[],
    error: (( err: Error ) => void)[]
};

type ChainSyncClientEvtName = keyof Omit<ChainSyncClientEvtListeners,"error">;
type AnyChainSyncClientEvtName = ChainSyncClientEvtName | "error";

type EvtListenerOf<EvtName extends AnyChainSyncClientEvtName> =
    EvtName extends "rollBackwards"     ? ( msg: ChainSyncRollBackwards ) => void :
    EvtName extends "rollForward"       ? ( msg: ChainSyncRollForward ) => void :
    EvtName extends "intersectFound"    ? ( msg: ChainSyncIntersectFound) => void :
    EvtName extends "intersectNotFound" ? ( msg: ChainSyncIntersectNotFound ) => void :
    EvtName extends "awaitReply"        ? ( msg: ChainSyncAwaitReply ) => void :
    EvtName extends "error"             ? ( err: Error ) => void :
    never;

type MsgOf<EvtName extends AnyChainSyncClientEvtName> =
    EvtName extends "rollBackwards"     ? ChainSyncRollBackwards :
    EvtName extends "rollForward"       ? ChainSyncRollForward :
    EvtName extends "intersectFound"    ? ChainSyncIntersectFound :
    EvtName extends "intersectNotFound" ? ChainSyncIntersectNotFound :
    EvtName extends "awaitReply"        ? ChainSyncAwaitReply :
    EvtName extends "error"             ? Error :
    never;

function isChainSyncClientEvtName( str: any ): str is ChainSyncClientEvtName
{
    return (
        str === "rollBackwards" ||
        str === "rollForward" ||
        str === "intersectFound" ||
        str === "intersectNotFound" ||
        str === "awaitReply"
    );
}

function isAnyChainSyncClientEvtName( str: any ): str is AnyChainSyncClientEvtName
{
    return isChainSyncClientEvtName( str ) || str === "error";
}

function msgToName( msg: ChainSyncMessage ): ChainSyncClientEvtName | undefined
{
    if( msg instanceof ChainSyncRollBackwards ) return "rollBackwards";
    if( msg instanceof ChainSyncRollForward ) return "rollForward";
    if( msg instanceof ChainSyncIntersectFound ) return "intersectFound";
    if( msg instanceof ChainSyncIntersectNotFound ) return "intersectNotFound";
    if( msg instanceof ChainSyncAwaitReply ) return "awaitReply";

    return undefined;
}

export interface IChainSyncClient {
    readonly mplexer: Multiplexer,

    addEventListener( evt: "rollBackwards"        , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "rollForward"          , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "intersectFound"       , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "intersectNotFound"    , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "awaitReply"           , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "error"                , listener: (err: Error) => void ): this
    addEventListener( evt: AnyChainSyncClientEvtName , listener: AnyChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this

    addListener( evt: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    addListener( evt: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    addListener( evt: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    addListener( evt: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    addListener( evt: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    addListener( evt: "error"                , listener: (err: Error) => void): this
    addListener( evt: AnyChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    on( evt: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    on( evt: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    on( evt: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    on( evt: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    on( evt: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    on( evt: "error"                , listener: (err: Error) => void ): this
    on( evt: ChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    once( evt: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    once( evt: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    once( evt: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    once( evt: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    once( evt: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    once( evt: "error"                , listener: (err: Error) => void ): this
    once( evt: ChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    removeEventListener( evt: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    removeEventListener( evt: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    removeEventListener( evt: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    removeEventListener( evt: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    removeEventListener( evt: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    removeEventListener( evt: "error"                , listener: (err: Error) => void ): this
    removeEventListener( evt: ChainSyncClientEvtName | "error", listener: ChainSyncClientEvtListener ): this

    removeListener( evt: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    removeListener( evt: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    removeListener( evt: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    removeListener( evt: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    removeListener( evt: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    removeListener( evt: "error"                , listener: (err: Error) => void ): this
    removeListener( evt: ChainSyncClientEvtName | "error" , listener: ChainSyncClientEvtListener ): this

    off( evt: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    off( evt: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    off( evt: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    off( evt: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    off( evt: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    off( evt: "error"                , listener: ErrorListener ): this
    off( evt: ChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    removeAllListeners( event?: ChainSyncClientEvtName | "error" ): this

    emit( evt: "rollBackwards"        , msg: ChainSyncRollBackwards ): boolean
    emit( evt: "rollForward"          , msg: ChainSyncRollForward ): boolean
    emit( evt: "intersectFound"       , msg: ChainSyncIntersectFound ): boolean
    emit( evt: "intersectNotFound"    , msg: ChainSyncIntersectNotFound ): boolean
    emit( evt: "awaitReply"           , msg: ChainSyncAwaitReply ): boolean
    emit( evt: "error"                , err: Error ): boolean
    emit( evt: ChainSyncClientEvtName | "error" , msg: ChainSyncMessage | Error ): boolean
    
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
     * 
     * @returns {true} `false` if event is cancelable, and at least one of the event handlers which received event called Event.preventDefault(). Otherwise `true`.
     */
    dispatchEvent( evt: "rollBackwards"        , msg: ChainSyncRollBackwards ): boolean
    dispatchEvent( evt: "rollForward"          , msg: ChainSyncRollForward ): boolean
    dispatchEvent( evt: "intersectFound"       , msg: ChainSyncIntersectFound ): boolean
    dispatchEvent( evt: "intersectNotFound"    , msg: ChainSyncIntersectNotFound ): boolean
    dispatchEvent( evt: "awaitReply"           , msg: ChainSyncAwaitReply ): boolean
    dispatchEvent( evt: "error"                , err: Error ): boolean
    dispatchEvent( evt: ChainSyncClientEvtName , msg: ChainSyncMessage ): boolean
}

export class ChainSyncClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: ( event   ?: ChainSyncClientEvtName ) => this;

    addEventListener:    <EvtName extends AnyChainSyncClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends AnyChainSyncClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends AnyChainSyncClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends AnyChainSyncClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends AnyChainSyncClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends AnyChainSyncClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends AnyChainSyncClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: ChainSyncClientEvtName ) => this
    emit:                <EvtName extends ChainSyncClientEvtName>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends ChainSyncClientEvtName>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    
    /** @deprecated */
    onRollBackwards: ( cb: ( msg: ChainSyncRollBackwards ) => void ) => void
    /** @deprecated */
    onRollForward: ( cb: ( msg: ChainSyncRollForward ) => void ) => void
    /** @deprecated */
    onIntersectFound: ( cb: ( msg: ChainSyncIntersectFound ) => void ) => void
    /** @deprecated */
    onIntersectNotFound: ( cb: ( msg: ChainSyncIntersectNotFound ) => void ) => void
    /** @deprecated */
    onAwaitReply: ( cb: ( msg: ChainSyncAwaitReply ) => void ) => void

    constructor( multiplexer: Multiplexer )
    {
        const self = this;

        const eventListeners: ChainSyncClientEvtListeners = {
            rollBackwards: [],
            rollForward: [],
            intersectFound: [],
            intersectNotFound: [],
            awaitReply: [],
            error: []
        };

        const onceEventListeners: ChainSyncClientEvtListeners = {
            rollBackwards: [],
            rollForward: [],
            intersectFound: [],
            intersectNotFound: [],
            awaitReply: [],
            error: []
        };

        function clearListeners( evt?: ChainSyncClientEvtName ): typeof self
        {
            if( isAnyChainSyncClientEvtName( evt ) )
            {
                eventListeners[evt].length = 0;
                onceEventListeners[evt].length = 0;
                return self;
            }
            eventListeners.rollBackwards.length     = 0;
            eventListeners.rollForward.length       = 0;
            eventListeners.intersectFound.length    = 0;
            eventListeners.intersectNotFound.length = 0;
            eventListeners.awaitReply.length        = 0;

            onceEventListeners.rollBackwards.length     = 0;
            onceEventListeners.rollForward.length       = 0;
            onceEventListeners.intersectFound.length    = 0;
            onceEventListeners.intersectNotFound.length = 0;
            onceEventListeners.awaitReply.length        = 0;

            return self;
        }

        function hasEventListeners( includeError: boolean = false ): boolean
        {
            return  (
                includeError ? (
                    eventListeners.error.length             > 0 ||
                    onceEventListeners.error.length         > 0
                ) : true
            ) && (
                eventListeners.rollBackwards.length     > 0 ||
                eventListeners.rollForward.length       > 0 ||
                eventListeners.intersectFound.length    > 0 ||
                eventListeners.intersectNotFound.length > 0 ||
                eventListeners.awaitReply.length        > 0 ||

                onceEventListeners.rollBackwards.length     > 0 ||
                onceEventListeners.rollForward.length       > 0 ||
                onceEventListeners.intersectFound.length    > 0 ||
                onceEventListeners.intersectNotFound.length > 0 ||
                onceEventListeners.awaitReply.length        > 0
            );
        }

        /** @deprecated */
        function onRollBackwards( cb: ( msg: ChainSyncRollBackwards ) => void ): void
        {
            eventListeners.rollBackwards.push( cb );
        }
        /** @deprecated */
        function onRollForward( cb: ( msg: ChainSyncRollForward ) => void ): void
        {
            eventListeners.rollForward.push( cb );
        }
        /** @deprecated */
        function onIntersectFound( cb: ( msg: ChainSyncIntersectFound ) => void ): void
        {
            eventListeners.intersectFound.push( cb );
        }
        /** @deprecated */
        function onIntersectNotFound( cb: ( msg: ChainSyncIntersectNotFound ) => void ): void
        {
            eventListeners.intersectNotFound.push( cb );
        }
        /** @deprecated */
        function onAwaitReply( cb: ( msg: ChainSyncAwaitReply ) => void ): void
        {
            eventListeners.awaitReply.push( cb );
        }

        function addEventListenerOnce( evt: AnyChainSyncClientEvtName, listener: AnyChainSyncClientEvtListener ): typeof self
        {
            if( !isAnyChainSyncClientEvtName( evt ) ) return self;

            onceEventListeners[ evt ].push( listener as any );
            return self;
        }
        function addEventListener( evt: AnyChainSyncClientEvtName, listener: ChainSyncClientEvtListener, opts?: AddEvtListenerOpts ): typeof self
        {
            if( opts?.once === true ) return addEventListenerOnce( evt, listener );
            
            if( !isAnyChainSyncClientEvtName( evt ) ) return self;
            
            eventListeners[ evt ].push( listener as any );
            return self;
        }
        function removeEventListener( evt: AnyChainSyncClientEvtName, listener: ChainSyncClientEvtListener ): typeof self
        {
            if( !isAnyChainSyncClientEvtName( evt ) ) return self;

            eventListeners[evt] = eventListeners[evt].filter( fn => fn !== listener ) as any;
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener ) as any;
            return self; 
        }

        function dispatchEvent( evt: AnyChainSyncClientEvtName, msg: ChainSyncMessage | Error ): boolean
        {
            // console.log( evt, msg );
            if( !isAnyChainSyncClientEvtName( evt ) ) return true;
            if( evt !== "error" && !isChainSyncMessage( msg ) ) return true;

            const listeners = eventListeners[ evt ];
            const nListeners = listeners.length;
            for(let i = 0; i < nListeners; i++)
            {
                listeners[i](msg as any);
            }

            const onceListeners = onceEventListeners[evt];
            while( onceListeners.length > 0 )
            {
                onceListeners.shift()!(msg as any);
            }

            return true;
        }

        Object.defineProperties(
            this, {
                mplexer:                { value: multiplexer, ...roDescr },
                clearListeners:         { value: clearListeners, ...roDescr },
                removeAllListeners:     { value: clearListeners, ...roDescr },
                onRollBackwards:        { value: onRollBackwards, ...roDescr },
                onRollForward:          { value: onRollForward, ...roDescr },
                onIntersectFound:       { value: onIntersectFound, ...roDescr },
                onIntersectNotFound:    { value: onIntersectNotFound, ...roDescr },
                onAwaitReply:           { value: onAwaitReply, ...roDescr },
                addEventListener:       { value: addEventListener, ...roDescr },
                addListener:            { value: addEventListener, ...roDescr },
                on:                     { value: addEventListener, ...roDescr },
                once:                   { value: addEventListenerOnce, ...roDescr },
                removeEventListener:    { value: removeEventListener, ...roDescr },
                removeListener:         { value: removeEventListener, ...roDescr },
                off:                    { value: removeEventListener, ...roDescr },
                dispatchEvent:          { value: dispatchEvent, ...roDescr },
                emit:                   { value: dispatchEvent, ...roDescr },
            }
        );

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: ChainSyncMessage[] = [];

        multiplexer.on( MiniProtocol.ChainSync, chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: ChainSyncMessage;

            if( prevBytes )
            {
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
                    Error.stackTraceLimit = originalSTLimit;
                    // assume the error is of "missing bytes";
                    prevBytes = Uint8Array.prototype.slice.call( chunk );
                    break;
                }

                offset = thing.offset;

                // console.log( "msg byetes", offset, toHex( chunk.subarray( 0, offset ) ) );
                // Error.stackTraceLimit = 0;
                try {
                    msg = chainSyncMessageFromCborObj( thing.parsed );
                    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
                    msg.cborBytes = Uint8Array.prototype.slice.call( chunk, 0, offset );
                    
                    queque.unshift( msg );
                }
                catch (e)
                {
                    // before dispatch event
                    Error.stackTraceLimit = originalSTLimit;

                    const err = new Error(
                        typeof e?.message === "string" ? e.message : "" +
                        "\ndata: " + toHex( chunk ) + "\n"
                    );
                    
                    dispatchEvent("error", err );
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

            let msgStr: ChainSyncClientEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }
        });
    }

    requestNext(): Promise<ChainSyncRollForward | ChainSyncRollBackwards>
    {
        const self = this;
        return new Promise( resolve => {
            function resolveForward( msg: ChainSyncRollForward )
            {
                self.removeEventListener("rollForward", resolveForward);
                self.removeEventListener("rollBackwards", resolveBackwards);
                resolve( msg );
            }
            function resolveBackwards( msg: ChainSyncRollBackwards )
            {
                self.removeEventListener("rollForward", resolveForward);
                self.removeEventListener("rollBackwards", resolveBackwards);
                resolve( msg );
            }
            this.once("rollForward", resolveForward );
            this.once("rollBackwards", resolveBackwards );
            this.mplexer.send(
                new ChainSyncRequestNext().toCbor().toBuffer(),
                {
                    hasAgency: true,
                    protocol: this.mplexer.isN2N ? 
                        MiniProtocol.ChainSync :
                        MiniProtocol.LocalChainSync
                }
            );
        });
    }

    findIntersect( points: IChainPoint[] ): Promise<ChainSyncIntersectFound | ChainSyncIntersectNotFound>
    {
        const self = this;
        return new Promise( resolve => {
            function resolveFound( msg: ChainSyncIntersectFound )
            {
                self.removeEventListener("intersectFound", resolveFound);
                self.removeEventListener("intersectNotFound", resolveNotFound);
                resolve( msg );
            }
            function resolveNotFound( msg: ChainSyncIntersectNotFound )
            {
                self.removeEventListener("intersectFound", resolveFound);
                self.removeEventListener("intersectNotFound", resolveNotFound);
                resolve( msg );
            }
            this.once("intersectFound", resolveFound );
            this.once("intersectNotFound", resolveNotFound );
            this.mplexer.send(
                new ChainSyncFindIntersect({ points }).toCbor().toBuffer(),
                {
                    hasAgency: true,
                    protocol: this.mplexer.isN2N ? 
                        MiniProtocol.ChainSync :
                        MiniProtocol.LocalChainSync
                }
            );
        })
    }

    done(): void
    {
        this.mplexer.send(
            new ChainSyncMessageDone().toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: this.mplexer.isN2N ? 
                    MiniProtocol.ChainSync :
                    MiniProtocol.LocalChainSync
            }
        );
        this.clearListeners();
    }
}