import { ITxIdAndSize, TxSubmitDone, TxSubmitReplyIds, TxSubmitReplyTxs } from "./messages";
import { TxSubmitMessage, txSubmitMessageFromCborObj } from "./TxSubmitMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { TxSubmitRequestTxs } from "./messages/TxSubmitRequestTxs";
import { TxSubmitRequestIds } from "./messages/TxSubmitRequestIds";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IMempool, TxHashAndSize } from "./interfaces";
import { forceMempoolTxHash, forceMempoolTxHashU8, MempoolTxHash, MempoolTxHashLike } from "./interfaces/types";
import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";

type TxSubmitClientEvt = keyof TxSubmitClientEvtListeners & string;

type TxSubmitClientEvtListeners = {
    requestTxIds:     TxSubmitClientEvtListener[],
    requestTxs:     TxSubmitClientEvtListener[]
};

type TxSubmitClientEvtListener = ( msg: TxSubmitMessage ) => void;

type MsgOf<EvtName extends TxSubmitClientEvt> =
    EvtName extends "requestTxIds"    ? TxSubmitRequestIds    :
    EvtName extends "requestTxs"    ? TxSubmitRequestTxs    :
    never                                                   ;

function msgToName( msg: TxSubmitMessage ): TxSubmitClientEvt | undefined 
{
    if( msg instanceof TxSubmitRequestIds )   return "requestTxIds";
    if( msg instanceof TxSubmitRequestTxs )   return "requestTxs";

    return undefined;
}

function isTxSubClientEvtName( stuff: any ): stuff is TxSubmitClientEvt
{
    return (
        stuff === "requestTxIds"        ||
        stuff === "requestTxs"
    );
}

type EvtListenerOf<Evt extends TxSubmitClientEvt> = ( ...args: any[] ) => any

export class TxSubmitClient 
{
    readonly mplexer: Multiplexer;

    readonly mempool: IMempool;

    private _eventListeners: TxSubmitClientEvtListeners = Object.freeze({
        requestTxIds:     [],
        requestTxs:     []
    });

    private _onceEventListeners: TxSubmitClientEvtListeners = Object.freeze({
        requestTxIds:     [],
        requestTxs:     []
    });

    constructor( 
        thisMultiplexer: Multiplexer, 
        thisMempool: IMempool 
    ) 
    {
        const self = this;

        this.mplexer = thisMultiplexer;
        this.mempool = thisMempool;

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
    
            let msgStr: TxSubmitClientEvt;
    
            while( msg = queque.pop()! ) 
            {
                msgStr = msgToName( msg )!;
    
                if( !msgStr ) continue;

                self.dispatchEvent( msgStr, msg );
            }
        });

        this.on( "requestTxs", ( msg ) => self.replyTxs( msg.ids ) );
        this.on( "requestTxIds", ( msg ) => msg.blocking ? 
            this.replyTxIdsBlocking( msg.knownTxCount, msg.requestedTxCount ) : 
            this.replyTxIds( msg.knownTxCount, msg.requestedTxCount )
        );
    }

    hasEventListeners(): boolean 
    {
        return this._hasEventListeners( this._eventListeners ) || this._hasEventListeners( this._onceEventListeners );
    }
    private _hasEventListeners( listeners: TxSubmitClientEvtListeners ): boolean 
    {
        return (
            listeners.requestTxIds.length > 0     ||
            listeners.requestTxs.length > 0
        );
    }

    addEventListenerOnce<EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) : typeof self 
    {
        const listeners = this._onceEventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }
    once<EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        return this.addEventListenerOnce( evt, listener );
    }

    addEventListener<EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ): typeof self 
    {
        if( options?.once ) return this.addEventListenerOnce( evt, listener );
        
        const listeners = this._eventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }
    addListener<Evt extends TxSubmitClientEvt>( evt: Evt, callback: ( data: MsgOf<Evt> ) => void ): this
    {
        return this.on( evt, callback );
    }
    on<Evt extends TxSubmitClientEvt>( evt: Evt, callback: ( data: MsgOf<Evt> ) => void ): this
    {
        const listeners = this._eventListeners[ evt ];
        if( !listeners ) return this;

        listeners.push( callback );
        
        return this;
    }

    removeEventListener<EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        let listeners = this._eventListeners[evt];

        if( !Array.isArray( listeners ) ) return self;

        this._eventListeners[evt] = listeners.filter( fn => fn !== listener );
        this._onceEventListeners[evt] = this._onceEventListeners[evt].filter( fn => fn !== listener );

        return self;
    }
    removeListener( evt: TxSubmitClientEvt, callback: ( data: any ) => void )
    {
        return this.off( evt, callback );
    }
    off( evt: TxSubmitClientEvt, callback: ( data: any ) => void )
    {
        const listeners = this._eventListeners[ evt ];
        if( !listeners ) return this;

        const idx = listeners.findIndex(( cb ) => callback === cb );
        if( idx < 0 ) return this;

        void listeners.splice( idx, 1 );

        return this;
    }

    emit<EvtName extends TxSubmitClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ): boolean
    {
        return this.dispatchEvent( evt, msg );
    }
    dispatchEvent( evt: TxSubmitClientEvt, msg: TxSubmitMessage ) : boolean
    {
        let listeners = this._eventListeners[ evt ]

        for( const cb of listeners ) cb( msg );

        listeners = this._onceEventListeners[ evt ];

        let cb: ( ...args: any[] ) => any;
        while( cb = listeners.shift()! ) cb( msg );

        return true;
    }

    removeAllListeners( event?: TxSubmitClientEvt ): void
    {
        return this.clearListeners( event );
    }
    clearListeners( evt?: TxSubmitClientEvt ) : void
    {
        _clearListeners( this._eventListeners, evt );
        _clearListeners( this._onceEventListeners, evt );
    }
    
    
    // tx-submission client messages

    async replyTxs( requestedIds: MempoolTxHashLike[] ): Promise<void>
    {
        // askedIdsHashes = askedIdsHashes.map( forceMempoolTxHash );

        const mempoolTxs = await this.mempool.getTxs( requestedIds );
        const response = mempoolTxs.map(({ bytes }) => bytes );
        
        this.mplexer.send(
            new TxSubmitReplyTxs({ txs: response }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.TxSubmission 
            }
        );
    }

    async replyTxIdsBlocking( knownTxCount: number, requestedTxCount: number ): Promise<void>
    {
        const nAttempts = 4;
        const delay = 10_000;

        let txCount = await this.mempool.getTxCount();

        if( txCount > 0 ) return this.replyTxIds( knownTxCount, requestedTxCount );

        for( let i = 0; i < nAttempts; i++ )
        {
            if( txCount <= 0 )
            {
                await new Promise( resolve => setTimeout( resolve, delay ) );
                txCount = await this.mempool.getTxCount()
                continue;
            }

            this.replyTxIds( 0, requestedTxCount + knownTxCount );
            return;
        }

        this.mplexer.send( 
            new TxSubmitDone().toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.TxSubmission 
            }
        );
    }

    async replyTxIds( knownTxCount: number, requestedTxCount: number ): Promise<void>
    {
        const hashesAndSizes = await this.mempool.getTxHashesAndSizes();
        
        const response = hashesAndSizes.map(
            ({ hash, size }) => ({ 
                txId: forceMempoolTxHashU8( hash ),
                txSize: size
            })
        );

        const filteredResponse = response.slice( knownTxCount, knownTxCount + requestedTxCount );

        this.mplexer.send( 
            new TxSubmitReplyIds({ response: filteredResponse }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.TxSubmission 
            }
        );
    }
}

function _clearListeners( listeners: TxSubmitClientEvtListeners, evt?: TxSubmitClientEvt ) : void
    {
        if( isTxSubClientEvtName( evt ) )
        {
            listeners[ evt ].length = 0;
        }
        else
        {
            for( const key in listeners )
            {
                listeners[ key as TxSubmitClientEvt ].length = 0;
            }
        }
    }