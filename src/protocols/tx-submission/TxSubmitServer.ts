import { TxSubmitMessage, txSubmitMessageFromCborObj } from "./TxSubmitMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { TxSubmitReplyIds } from "./messages/TxSubmitReplyIds";
import { TxSubmitReplyTxs } from "./messages/TxSubmitReplyTxs";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { TxSubmitDone } from "./messages/TxSubmitDone";
import { TxSubmitInit } from "./messages/TxSubmitInit";
import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { IMempool } from "./interfaces";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

type TxSubmitServerEvtListener = ( msg: TxSubmitMessage ) => void;

type TxSubmitServerEvtListeners = {
    init: TxSubmitServerEvtListener[],
    replyIds: TxSubmitServerEvtListener[],
    replyTxs: TxSubmitServerEvtListener[],
    done  : TxSubmitServerEvtListener[]
};

type TxSubmitServerEvt = keyof TxSubmitServerEvtListeners;

function _clearListeners( listeners: TxSubmitServerEvtListeners, evt?: TxSubmitServerEvt ) 
{
    const arr = listeners[evt!];

    if( Array.isArray( arr ) ) {
        arr.length = 0;
        return;
    }

    listeners.init.length = 0;
    listeners.replyIds.length = 0;
    listeners.replyTxs.length = 0;
    listeners.done.length = 0;
}

function _hasEventListeners( listeners: TxSubmitServerEvtListeners ): boolean 
{
    return (
        listeners.init.length > 0       ||
        listeners.replyIds.length > 0   ||
        listeners.replyTxs.length > 0   ||
        listeners.done.length   > 0
    );
}

function msgToName( msg: TxSubmitMessage ): TxSubmitServerEvt | undefined 
{
    if( msg instanceof TxSubmitInit ) return "done";
    if( msg instanceof TxSubmitReplyIds ) return "replyIds";
    if( msg instanceof TxSubmitReplyTxs ) return "replyTxs";
    if( msg instanceof TxSubmitDone )   return "done";

    return undefined;
}

export type TxSubmitResult = { ok: true, msg: undefined } | { ok: false, msg: bigint }

type EvtListenerOf<Evt extends TxSubmitServerEvt> = ( ...args: any[] ) => any
type MsgOf<Evt extends TxSubmitServerEvt> = {}

export class TxSubmitServer 
{
    readonly _multiplexer: Multiplexer;
    get multiplexer(): Multiplexer 
    {
        return this._multiplexer;
    }

    clearListeners!: () => void;

    addEventListener:    <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event?: TxSubmitServerEvt ) => this
    emit:                <EvtName extends TxSubmitServerEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends TxSubmitServerEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean

    constructor( thisMultiplexer: Multiplexer ) 
    {

        const self = this;

        const eventListeners: TxSubmitServerEvtListeners = {
            init: [],
            replyIds: [],
            replyTxs: [],
            done: []
        };

        const onceEventListeners: TxSubmitServerEvtListeners = {
            init: [],
            replyIds: [],
            replyTxs: [],
            done: []
        };

        function clearListeners( evt?: TxSubmitServerEvt ): void 
        {
            _clearListeners( eventListeners, evt );
            _clearListeners( onceEventListeners, evt );
        }

        function hasEventListeners(): boolean 
        {
            return _hasEventListeners( eventListeners ) || _hasEventListeners( onceEventListeners );
        }

        function addEventListenerOnce<EvtName extends TxSubmitServerEvt>( 
            evt: EvtName, 
            listener: EvtListenerOf<EvtName> 
        ) : typeof self 
        {
            const listeners = onceEventListeners[ evt ];

            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );

            return self;
        }

        function addEventListener<EvtName extends TxSubmitServerEvt>( 
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

        function removeEventListener<EvtName extends TxSubmitServerEvt>(
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

        function dispatchEvent( evt: TxSubmitServerEvt, msg: TxSubmitMessage ) 
        {
            let listeners = eventListeners[ evt ]

            if( !listeners ) return;

            for( const cb of listeners ) cb( msg );

            listeners = onceEventListeners[ evt ];
            let cb: TxSubmitServerEvtListener;

            while( cb = listeners.shift()! ) cb( msg );

            return true;
        }

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: TxSubmitMessage[] = [];

        thisMultiplexer.on( MiniProtocol.TxSubmission, chunk => {
            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: TxSubmitMessage;

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
                try 
                {
                    thing = Cbor.parseWithOffset( chunk );
                } 
                catch 
                {
                    prevBytes = chunk.slice();
                    break;
                }
                
                offset = thing.offset;

                msg = txSubmitMessageFromCborObj( thing.parsed )
                queque.unshift( msg );

                if( offset < chunk.length ) 
                {
                    chunk = chunk.subarray( offset );
                    continue;
                }
                else 
                {
                    prevBytes = undefined;
                    break;
                }
            }

            let msgStr: TxSubmitServerEvt;

            while( msg = queque.pop()! ) 
            {
                msgStr = msgToName( msg )!;

                if( !msgStr ) continue;

                const listeners = eventListeners[ msgStr ];

                for( const cb of listeners ) 
                {
                    void cb( msg );
                }
            }
        });

        this._multiplexer = thisMultiplexer;

        Object.defineProperties(
            this, {
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

    }

    //TODO: tx-submission server messages implementation
        
}
