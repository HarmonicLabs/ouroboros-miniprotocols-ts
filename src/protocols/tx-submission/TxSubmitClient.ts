import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { TxSubmitMessage, txSubmitMessageFromCborObj } from "./TxSubmitMessage";
import { TxSubmitReplyIds } from "./messages/TxSubmitReplyIds";
import { TxSubmitReplyTxs } from "./messages/TxSubmitReplyTxs";
import { TxSubmitRequestIds } from "./messages/TxSubmitRequestIds";
import { TxSubmitRequestTxs } from "./messages/TxSubmitRequestTxs";
import { TxSubmitDone } from "./messages/TxSubmitDone";
import { TxSubmitInit } from "./messages/TxSubmitInit";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

type TxSubmitClientEvtListener = ( msg: TxSubmitMessage ) => void;

type TxSubmitClientEvtListeners = {
    init: TxSubmitClientEvtListener[],    
    requestIds: TxSubmitClientEvtListener[],
    requestTxs: TxSubmitClientEvtListener[],
    replyIds: TxSubmitClientEvtListener[],
    replyTxs: TxSubmitClientEvtListener[],
    done  : TxSubmitClientEvtListener[]
};

type TxSubmitClientEvt = keyof TxSubmitClientEvtListeners;

function _clearListeners( listeners: TxSubmitClientEvtListeners, evt?: TxSubmitClientEvt ) {
    const arr = listeners[evt!];

    if( Array.isArray( arr ) ) {
        arr.length = 0;
        return;
    }

    listeners.init.length = 0;
    listeners.requestIds.length = 0;
    listeners.requestTxs.length = 0;
    listeners.replyIds.length = 0;
    listeners.replyTxs.length = 0;
    listeners.done.length = 0;
}

function _hasEventListeners( listeners: TxSubmitClientEvtListeners ): boolean {
    return (
        listeners.init.length > 0       ||
        listeners.requestIds.length > 0 ||
        listeners.requestTxs.length > 0 ||
        listeners.replyIds.length > 0   ||
        listeners.replyTxs.length > 0   ||
        listeners.done.length   > 0
    );
}

function msgToName( msg: TxSubmitMessage ): TxSubmitClientEvt | undefined {
    if( msg instanceof TxSubmitInit ) return "done";
    if( msg instanceof TxSubmitRequestIds ) return "requestIds";
    if( msg instanceof TxSubmitRequestTxs ) return "requestTxs";
    if( msg instanceof TxSubmitReplyIds ) return "replyIds";
    if( msg instanceof TxSubmitReplyTxs ) return "replyTxs";
    if( msg instanceof TxSubmitDone )   return "done";

    return undefined;
}

export type TxSubmitResult = { ok: true, msg: undefined } | { ok: false, msg: bigint }

type EvtListenerOf<Evt extends TxSubmitClientEvt> = ( ...args: any[] ) => any
type MsgOf<Evt extends TxSubmitClientEvt> = {}


export class TxSubmitClient {

    readonly multiplexer: Multiplexer;

    clearListeners!: () => void;

    addEventListener:    <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event?: TxSubmitClientEvt ) => this
    emit:                <EvtName extends TxSubmitClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends TxSubmitClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean

    constructor( thisMultiplexer: Multiplexer ) {

        const self = this;

        const eventListeners: TxSubmitClientEvtListeners = {
            init: [],
            requestIds: [],
            requestTxs: [],
            replyIds: [],
            replyTxs: [],
            done: []
        };

        const onceEventListeners: TxSubmitClientEvtListeners = {
            init: [],
            requestIds: [],
            requestTxs: [],
            replyIds: [],
            replyTxs: [],
            done: []
        };

        function clearListeners( evt?: TxSubmitClientEvt ): void {
            _clearListeners( eventListeners, evt );
            _clearListeners( onceEventListeners, evt );
        }

        function hasEventListeners(): boolean {
            return _hasEventListeners( eventListeners ) || _hasEventListeners( onceEventListeners );
        }

        function addEventListenerOnce<EvtName extends TxSubmitClientEvt>( 
            evt: EvtName, 
            listener: EvtListenerOf<EvtName> 
        ): typeof self {
            const listeners = onceEventListeners[ evt ];

            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );

            return self;
        }

        function addEventListener<EvtName extends TxSubmitClientEvt>( 
            evt: EvtName, 
            listener: EvtListenerOf<EvtName>, 
            options?: AddEvtListenerOpts 
        ): typeof self {
            if( options?.once ) return addEventListenerOnce( evt, listener );
            
            const listeners = eventListeners[ evt ];

            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );

            return self;
        }

        function removeEventListener<EvtName extends TxSubmitClientEvt>(
            evt: EvtName, 
            listener: EvtListenerOf<EvtName>
        ): typeof self {
            let listeners = eventListeners[evt];

            if( !Array.isArray( listeners ) ) return self;

            eventListeners[evt] = listeners.filter( fn => fn !== listener );
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener );

            return self;
        }

        function dispatchEvent( evt: TxSubmitClientEvt, msg: TxSubmitMessage ) {
            let listeners = eventListeners[ evt ]

            if( !listeners ) return;

            for( const cb of listeners ) cb( msg );

            listeners = onceEventListeners[ evt ];
            let cb: TxSubmitClientEvtListener;

            while( cb = listeners.shift()! ) cb( msg );

            return true;
        }

        Object.defineProperties(
            this, {
                multiplexer:            { value: thisMultiplexer, ...roDescr },
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
        const queque: TxSubmitMessage[] = [];

        thisMultiplexer.on( MiniProtocol.TxSubmission, chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: TxSubmitMessage;

            if( prevBytes ) {
                const tmp = new Uint8Array( prevBytes.length + chunk.length );

                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( true ) {
                try {
                    thing = Cbor.parseWithOffset( chunk );
                } catch {
                    prevBytes = chunk.slice();
                    break;
                }
                
                offset = thing.offset;

                msg = txSubmitMessageFromCborObj( thing.parsed )
                queque.unshift( msg );

                if( offset < chunk.length ) {
                    chunk = chunk.subarray( offset );
                    continue;
                }
                else {
                    prevBytes = undefined;
                    break;
                }
            }

            let msgStr: TxSubmitClientEvt;

            while( msg = queque.pop()! ) {
                msgStr = msgToName( msg )!;

                if( !msgStr ) continue;

                const listeners = eventListeners[ msgStr ];

                for( const cb of listeners ) {
                    void cb( msg );
                }
            }

        });

    }

    // TO-DO TX-SUBMISSION MESSAGES
        
}