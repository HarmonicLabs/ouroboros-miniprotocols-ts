import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IChainPoint } from "../types/ChainPoint";
import { LocalTxSubmitMessage, localTxSubmitMessageFromCborObj } from "./LocalTxSubmitMessage";
import { LocalTxSubmitAccept } from "./LocalTxSubmitAccept";
import { LocalTxSubmitReject } from "./LocalTxSubmitReject";
import { LocalTxSubmitSubmit } from "./LocalTxSubmitSubmit";
import { LocalTxSubmitDone } from "./LocalTxSubmitDone";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

type LocalTxSubmitClientEvtListener = ( msg: LocalTxSubmitMessage ) => void;

type LocalTxSubmitClientEvtListeners = {
    submit: LocalTxSubmitClientEvtListener[],
    reject: LocalTxSubmitClientEvtListener[],
    accept: LocalTxSubmitClientEvtListener[],
    done  : LocalTxSubmitClientEvtListener[],
};


type LocalTxSubmitClientEvt = keyof LocalTxSubmitClientEvtListeners;

function _clearListeners( listeners: LocalTxSubmitClientEvtListeners, evt?: LocalTxSubmitClientEvt )
{
    const arr = listeners[evt!];
    if( Array.isArray( arr ) )
    {
        arr.length = 0;
        return;
    }
    listeners.submit.length = 0;
    listeners.accept.length = 0;
    listeners.reject.length = 0;
    listeners.done  .length = 0;
}

function _hasEventListeners( listeners: LocalTxSubmitClientEvtListeners ): boolean
{
    return (
        listeners.submit.length > 0 ||
        listeners.reject.length > 0 ||
        listeners.accept.length > 0 ||
        listeners.done.length   > 0
    );
}

function msgToName( msg: LocalTxSubmitMessage ): LocalTxSubmitClientEvt | undefined
{
    if( msg instanceof LocalTxSubmitSubmit ) return "submit";
    if( msg instanceof LocalTxSubmitReject ) return "reject";
    if( msg instanceof LocalTxSubmitAccept ) return "accept";
    if( msg instanceof LocalTxSubmitDone )   return "done";

    return undefined;
}

export type TxSubmitResult = {
    ok: true,
    /** `LocalTxSubmitAccept` carries no informatons */
    msg: undefined
} | {
    ok: false,
    /** `LocalTxSubmitReject` reason */
    msg: bigint
}

type EvtListenerOf<Evt extends LocalTxSubmitClientEvt> = ( ...args: any[] ) => any
type MsgOf<Evt extends LocalTxSubmitClientEvt> = {}


export class LocalTxSubmitClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: () => void;

    addEventListener:    <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: LocalTxSubmitClientEvt ) => this
    emit:                <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends LocalTxSubmitClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean


    constructor( multiplexer: Multiplexer )
    {
        const self = this;

        const eventListeners: LocalTxSubmitClientEvtListeners = {
            submit: [],
            reject: [],
            accept: [],
            done: [],
        };
        const onceEventListeners: LocalTxSubmitClientEvtListeners = {
            submit: [],
            reject: [],
            accept: [],
            done: [],
        };

        function clearListeners( evt?: LocalTxSubmitClientEvt ): void
        {
            _clearListeners( eventListeners, evt );
            _clearListeners( onceEventListeners, evt );
        }

        function hasEventListeners(): boolean
        {
            return _hasEventListeners( eventListeners ) || _hasEventListeners( onceEventListeners );
        }

        function addEventListenerOnce<EvtName extends LocalTxSubmitClientEvt>(
            evt: EvtName,
            listener: EvtListenerOf<EvtName>
        ): typeof self
        {
            const listeners = onceEventListeners[ evt ];
            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );
            return self;
        }
        function addEventListener<EvtName extends LocalTxSubmitClientEvt>(
            evt: EvtName,
            listener: EvtListenerOf<EvtName>,
            options?: AddEvtListenerOpts 
        ): typeof self
        {
            if( options?.once ) return addEventListenerOnce( evt, listener );
            
            const listeners = eventListeners[ evt ];
            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );
            return self;
        }
        function removeEventListener<EvtName extends LocalTxSubmitClientEvt>(
            evt: EvtName, 
            listener: EvtListenerOf<EvtName>
        ): typeof self
        {
            let listeners = eventListeners[evt];
            if( !Array.isArray( listeners ) ) return self;
            eventListeners[evt] = listeners.filter( fn => fn !== listener );
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener );
            return self;
        }

        function dispatchEvent( evt: LocalTxSubmitClientEvt, msg: LocalTxSubmitMessage )
        {
            let listeners = eventListeners[ evt ]
            if( !listeners ) return;
            for( const cb of listeners ) cb( msg );
            listeners = onceEventListeners[ evt ];
            let cb: LocalTxSubmitClientEvtListener;
            while( cb = listeners.shift()! ) cb( msg );
            return true;
        }

        Object.defineProperties(
            this, {
                mplexer:                { value: multiplexer, ...roDescr },
                clearListeners:         { value: clearListeners, ...roDescr },
                removeAllListeners:     { value: clearListeners, ...roDescr },
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
        const queque: LocalTxSubmitMessage[] = [];

        multiplexer.on( MiniProtocol.LocalTxSubmission, chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: LocalTxSubmitMessage;

            if( prevBytes )
            {
                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( true )
            {
                try {
                    thing = Cbor.parseWithOffset( chunk );
                }
                catch
                {
                    // assume the error is of "missing bytes";
                    prevBytes = chunk.slice();
                    break;
                }
                
                offset = thing.offset;

                msg = localTxSubmitMessageFromCborObj( thing.parsed )
                queque.unshift( msg );

                if( offset < chunk.length )
                {
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );
                    continue;
                }
                else // if( offset >= chunk.length )
                {
                    prevBytes = undefined;
                    break;
                }
            }

            let msgStr: LocalTxSubmitClientEvt;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                const listeners = eventListeners[ msgStr ];
                for( const cb of listeners )
                {
                    void cb( msg );
                }
            }

        });
    }

    submit( txData: Uint8Array ): Promise<TxSubmitResult>
    {
        const self = this;
        return new Promise( resolve => {
            function handleAccept( _msg: LocalTxSubmitAccept )
            {
                self.removeListener("accept", handleAccept);
                self.removeListener("reject", handleReject);
                resolve({
                    ok: true,
                    // needs to be here to have same V8 shape
                    msg: undefined
                });
            }
            function handleReject( msg: LocalTxSubmitReject )
            {
                self.removeListener("accept", handleAccept);
                self.removeListener("reject", handleReject);
                resolve({
                    ok: false,
                    msg: msg.reason
                });
            }
            self.on("accept", handleAccept);
            self.on("reject", handleReject)
            self.mplexer.send(
                new LocalTxSubmitSubmit({ tx: txData }).toCbor().toBuffer(),
                {
                    hasAgency: true,
                    protocol: MiniProtocol.LocalTxSubmission
                }
            );
        });
    }

    done(): void
    {
        this.mplexer.send(
            new LocalTxSubmitDone().toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: MiniProtocol.LocalTxSubmission
            }
        );
    }
}