import { TxSubmitMessage, txSubmitMessageFromCborObj } from "./TxSubmitMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { TxSubmitReplyIds } from "./messages/TxSubmitReplyIds";
import { TxSubmitReplyTxs } from "./messages/TxSubmitReplyTxs";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { TxSubmitDone } from "./messages/TxSubmitDone";
import { TxSubmitInit } from "./messages/TxSubmitInit";
import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { TxHashAndSize } from "./interfaces";
import { TxSubmitRequestIds } from "./messages";

type TxSubmitServerEvt = keyof TxSubmitServerEvtListeners & string;

type TxSubmitServerEvtListeners = {
    init        : TxSubmitServerEvtListener[],
    replyIds    : TxSubmitServerEvtListener[],
    replyTxs    : TxSubmitServerEvtListener[],
    done        : TxSubmitServerEvtListener[]
};

type TxSubmitServerEvtListener = ( msg: TxSubmitMessage ) => void;

type MsgOf<EvtName extends TxSubmitServerEvt> =
    EvtName extends "init"              ? TxSubmitInit      :
    EvtName extends "replyIds"          ? TxSubmitReplyIds  :
    EvtName extends "replyTxs"          ? TxSubmitReplyTxs  :
    EvtName extends "done"              ? TxSubmitDone      : 
    never                                                   ;

function msgToName( msg: TxSubmitMessage ): TxSubmitServerEvt | undefined 
{
    if( msg instanceof TxSubmitInit )       return "init"       ;
    if( msg instanceof TxSubmitReplyIds )   return "replyIds"   ;
    if( msg instanceof TxSubmitReplyTxs )   return "replyTxs"   ;
    if( msg instanceof TxSubmitDone )       return "done"       ;

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

type EvtListenerOf<Evt extends TxSubmitServerEvt> = ( ...args: any[] ) => any

export class TxSubmitServer 
{
    readonly mplexer: Multiplexer;

    private _eventListeners: TxSubmitServerEvtListeners = Object.freeze({
        init:       [],
        replyIds:   [],
        replyTxs:   [],
        done:       []
    });

    private _onceEventListeners: TxSubmitServerEvtListeners = Object.freeze({
        init:       [],
        replyIds:   [],
        replyTxs:   [],
        done:       []
    });
    
    addListener:         <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends TxSubmitServerEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event?: TxSubmitServerEvt ) => this
    emit:                <EvtName extends TxSubmitServerEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean

    constructor( thisMultiplexer: Multiplexer ) 
    {
        const self = this;

        this.mplexer = thisMultiplexer;

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: TxSubmitMessage[] = [];

        this.mplexer.on( MiniProtocol.TxSubmission, ( chunk ) => {
            if( !self.hasEventListeners() ) return;
    
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
    
                self.dispatchEvent( msgStr, msg );
            }
        });
    }

    requestTxIds( requesting: number, acknowleged?: number ): Promise<TxSubmitReplyIds>
    requestTxIds( requesting: number, acknowleged: number | undefined, blocking: false ): Promise<TxSubmitReplyIds>
    requestTxIds( requesting: number, acknowleged: number | undefined, blocking: true ): Promise<TxSubmitReplyIds | TxSubmitDone>
    requestTxIds(
        requesting: number,
        acknowleged: number = 0,
        blocking: boolean = false
    ): Promise<TxSubmitReplyIds | TxSubmitDone>
    {
        // 4 bytes unsigned integers
        acknowleged = acknowleged >>> 0;
        requesting = requesting >>> 0;

        const self = this;

        return new Promise( resolve => {
            function handleReply( msg: TxSubmitReplyIds | TxSubmitDone )
            {
                self.off("replyIds", handleReply );
                blocking && self.off("done", handleReply );
                resolve( msg );
            }
            self.on("replyIds", handleReply );
            blocking && self.on("done", handleReply)

            self.mplexer.send(
                new TxSubmitRequestIds({
                    blocking,
                    knownTxCount: acknowleged,
                    requestedTxCount: requesting
                }).toCbor().toBuffer(),
                {
                    hasAgency: true,
                    protocol: MiniProtocol.TxSubmission
                }
            );
        })
    }

    requestTxs( txHashes: Uint8Array[] ): Promise<TxSubmitReplyTxs>
    {
        const self = this;

        return new Promise( resolve => {
            function handleReply( msg: TxSubmitReplyTxs )
            {
                self.off("replyTxs", handleReply );
                resolve( msg );
            }
            self.on("replyTxs", handleReply );

            self.mplexer.send(
                new TxSubmitReplyTxs({ txs: txHashes }).toCbor().toBuffer(),
                {
                    hasAgency: true,
                    protocol: MiniProtocol.TxSubmission
                }
            );
        });
    }

    hasEventListeners(): boolean 
    {
        return _hasEventListeners( this._eventListeners ) || _hasEventListeners( this._onceEventListeners );
    }

    addEventListenerOnce<EvtName extends TxSubmitServerEvt>( 
        evt: EvtName, 
        listener: EvtListenerOf<EvtName> 
    ) : typeof self 
    {
        const listeners = this._onceEventListeners[ evt ];

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
        
        const listeners = this._eventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }

    removeEventListener<EvtName extends TxSubmitServerEvt>(
        evt: EvtName, 
        listener: EvtListenerOf<EvtName>
    ): typeof self 
    {
        let listeners = this._eventListeners[evt];

        if( !Array.isArray( listeners ) ) return self;

        this._eventListeners[evt] = listeners.filter( fn => fn !== listener );
        this._onceEventListeners[evt] = this._onceEventListeners[evt].filter( fn => fn !== listener );

        return self;
    }

    dispatchEvent( evt: TxSubmitServerEvt, msg: TxSubmitMessage ) 
    {
        let listeners = this._eventListeners[ evt ]
        if( !listeners ) return;

        for( const cb of listeners ) cb( msg );

        listeners = this._onceEventListeners[ evt ];

        let cb: ( ...args: any[] ) => any;
        while( cb = listeners.shift()! ) cb( msg );

        return true;
    }

    clearListeners( evt?: TxSubmitServerEvt ) 
    {
        _clearListeners( this._eventListeners, evt );
        _clearListeners( this._onceEventListeners, evt );
    }
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
