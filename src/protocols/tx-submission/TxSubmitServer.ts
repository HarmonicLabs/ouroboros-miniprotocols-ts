import { TxSubmitMessage, txSubmitMessageFromCborObj } from "./TxSubmitMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { TxSubmitReplyIds } from "./messages/TxSubmitReplyIds";
import { TxSubmitReplyTxs } from "./messages/TxSubmitReplyTxs";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { TxSubmitDone } from "./messages/TxSubmitDone";
import { TxSubmitInit } from "./messages/TxSubmitInit";
import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";

type TxSubmitServerEvt = keyof TxSubmitServerEvtListeners & string;

type TxSubmitServerEvtListeners = {
    init        : TxSubmitServerEvtListener[],
    replyIds    : TxSubmitServerEvtListener[],
    replyTxs    : TxSubmitServerEvtListener[],
    done        : TxSubmitServerEvtListener[]
};

type TxSubmitServerEvtListener = ( msg: TxSubmitMessage ) => void;

type MsgOf<EvtName extends TxSubmitServerEvt> =
    EvtName extends "done"              ? TxSubmitInit      :
    EvtName extends "replyIds"          ? TxSubmitReplyIds  :
    EvtName extends "replyTxs"          ? TxSubmitReplyTxs  :
    EvtName extends "done"              ? TxSubmitDone      : 
    never                                                   ;

function msgToName( msg: TxSubmitMessage ): TxSubmitServerEvt | undefined 
{
    if( msg instanceof TxSubmitInit )       return "done";
    if( msg instanceof TxSubmitReplyIds )   return "replyIds";
    if( msg instanceof TxSubmitReplyTxs )   return "replyTxs";
    if( msg instanceof TxSubmitDone )       return "done";

    return undefined;
}

function isTxSubServerEvtName( stuff: any ): stuff is TxSubmitServerEvt
{
    return (
        stuff === "done"            ||
        stuff === "replyIds"        ||
        stuff === "replyTxs"        ||
        stuff === "done"      
    );
}

export type TxSubmitResult = { ok: true, msg: undefined } | { ok: false, msg: bigint }

type EvtListenerOf<Evt extends TxSubmitServerEvt> = ( ...args: any[] ) => any

export class TxSubmitServer 
{
    readonly _multiplexer: Multiplexer;
    get multiplexer(): Multiplexer 
    {
        return this._multiplexer;
    }

    private _eventListeners: TxSubmitServerEvtListeners = Object.freeze({
        init:       [],
        replyIds:   [],
        replyTxs:   [],
        done:       []
    });
    get eventListeners(): TxSubmitServerEvtListeners 
    {
        return this._eventListeners;
    }

    private _onceEventListeners: TxSubmitServerEvtListeners = Object.freeze({
        init:       [],
        replyIds:   [],
        replyTxs:   [],
        done:       []
    });
    get onceEventListeners(): TxSubmitServerEvtListeners 
    {
        return this._onceEventListeners;
    }
    
    addListener:         <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event?: TxSubmitServerEvt ) => this
    emit:                <EvtName extends TxSubmitServerEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean

    constructor( thisMultiplexer: Multiplexer ) 
    { 
        this._multiplexer = thisMultiplexer;

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: TxSubmitMessage[] = [];

        this.multiplexer.on( MiniProtocol.TxSubmission, ( chunk ) => {
            if( !this.hasEventListeners() ) return;
    
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
    
                const listeners = this.eventListeners[ msgStr ];
    
                for( const cb of listeners ) 
                {
                    void cb( msg );
                }
            }
        });
    }

    hasEventListeners(): boolean 
    {
        return _hasEventListeners( this.eventListeners ) || _hasEventListeners( this.onceEventListeners );
    }

    addEventListenerOnce<EvtName extends TxSubmitServerEvt>( 
        evt: EvtName, 
        listener: EvtListenerOf<EvtName> 
    ) : typeof self 
    {
        const listeners = this.onceEventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }

    addEventListener<EvtName extends TxSubmitServerEvt>( 
        evt: EvtName, 
        listener: EvtListenerOf<EvtName>, 
        options?: AddEvtListenerOpts 
    ): typeof self 
    {
        if( options?.once ) return this.addEventListenerOnce( evt, listener );
        
        const listeners = this.eventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }

    removeEventListener<EvtName extends TxSubmitServerEvt>(
        evt: EvtName, 
        listener: EvtListenerOf<EvtName>
    ): typeof self 
    {
        let listeners = this.eventListeners[evt];

        if( !Array.isArray( listeners ) ) return self;

        this.eventListeners[evt] = listeners.filter( fn => fn !== listener );
        this.onceEventListeners[evt] = this.onceEventListeners[evt].filter( fn => fn !== listener );

        return self;
    }

    dispatchEvent( evt: TxSubmitServerEvt, msg: TxSubmitMessage ) 
    {
        let listeners = this.eventListeners[ evt ]

        if( !listeners ) return;

        for( const cb of listeners ) cb( msg );

        listeners = this.onceEventListeners[ evt ];
        let cb: TxSubmitServerEvtListener;

        while( cb = listeners.shift()! ) cb( msg );

        return true;
    }

    clearListeners( evt?: TxSubmitServerEvt ) 
    {
        _clearListeners( this.eventListeners, evt );
        _clearListeners( this.onceEventListeners, evt );
    }
    
    //TODO: tx-submission server messages implementation
        
}

function _hasEventListeners( listeners: TxSubmitServerEvtListeners ): boolean 
{
    return (
        listeners.init.length       > 0     ||
        listeners.replyIds.length   > 0     ||
        listeners.replyTxs.length   > 0     ||
        listeners.done.length       > 0
    );
}

function _clearListeners( listeners: TxSubmitServerEvtListeners, evt?: TxSubmitServerEvt ) 
{
    if( isTxSubServerEvtName( evt ) )
    {
        listeners[ evt ] = [];
    }
    else
    {
        for( const key in listeners )
        {
            if( listeners.hasOwnProperty(key) ) 
            {
                listeners[key as TxSubmitServerEvt] = [];
            }
        }
    }
}
