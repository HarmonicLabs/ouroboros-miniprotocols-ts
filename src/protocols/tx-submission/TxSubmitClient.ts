import { ITxIdAndSize, TxSubmitDone, TxSubmitReplyIds, TxSubmitReplyTxs } from "./messages";
import { TxSubmitMessage, txSubmitMessageFromCborObj } from "./TxSubmitMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { TxSubmitRequestTxs } from "./messages/TxSubmitRequestTxs";
import { TxSubmitRequestIds } from "./messages/TxSubmitRequestIds";
import { Cbor, CborArray, CborObj } from "@harmoniclabs/cbor";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IMempool, TxHashAndSize } from "./interfaces";
import { MempoolTxHash } from "./interfaces/types";
import { MiniProtocol } from "../../MiniProtocol";

type TxSubmitClientEvt = keyof TxSubmitClientEvtListeners & string;

type TxSubmitClientEvtListeners = {
    requestIds:     TxSubmitClientEvtListener[],
    requestTxs:     TxSubmitClientEvtListener[]
};

type TxSubmitClientEvtListener = ( msg: TxSubmitMessage ) => void;

type MsgOf<EvtName extends TxSubmitClientEvt> =
    EvtName extends "requestIds"    ? TxSubmitRequestIds    :
    EvtName extends "requestTxs"    ? TxSubmitRequestTxs    :
    never                                                   ;

function msgToName( msg: TxSubmitMessage ): TxSubmitClientEvt | undefined 
{
    if( msg instanceof TxSubmitRequestIds )   return "requestIds";
    if( msg instanceof TxSubmitRequestTxs )   return "requestTxs";

    return undefined;
}

function isTxSubClientEvtName( stuff: any ): stuff is TxSubmitClientEvt
{
    return (
        stuff === "requestIds"        ||
        stuff === "requestTxs"
    );
}

export type TxSubmitResult = { ok: true, msg: undefined } | { ok: false, msg: bigint }

type EvtListenerOf<Evt extends TxSubmitClientEvt> = ( ...args: any[] ) => any

export class TxSubmitClient 
{
    readonly _multiplexer: Multiplexer;
    get multiplexer(): Multiplexer 
    {
        return this._multiplexer;
    }

    readonly _mempool: IMempool;
    get mempool(): IMempool 
    {
        return this._mempool;
    }

    private _eventListeners: TxSubmitClientEvtListeners = Object.freeze({
        requestIds:     [],
        requestTxs:     []
    });
    get eventListeners(): TxSubmitClientEvtListeners 
    {
        return this._eventListeners;
    }

    private _onceEventListeners: TxSubmitClientEvtListeners = Object.freeze({
        requestIds:     [],
        requestTxs:     []
    });
    get onceEventListeners(): TxSubmitClientEvtListeners 
    {
        return this._onceEventListeners;
    }

    constructor( 
        thisMultiplexer: Multiplexer, 
        thisMempool: IMempool 
    ) 
    { 
        this._multiplexer = thisMultiplexer;
        this._mempool = thisMempool;

        var prevBytes: Uint8Array | undefined = undefined;
        const queque: TxSubmitMessage[] = [];

        this.multiplexer.on( MiniProtocol.TxSubmission, ( chunk ) => {
            if( !this.hasEventListeners() ) return;
    
            var offset: number = -1;
            var thing: { parsed: CborObj, offset: number };
    
            var msg: TxSubmitMessage;
    
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
    
            var msgStr: TxSubmitClientEvt;
    
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

        this.on( "requestTxs", ( msg ) => this.replyTxs( msg.ids ) );
        this.on( "requestIds", ( msg ) => msg.blocking ? 
            this.replyIdsBlocking( msg.knownTxCount, msg.requestedTxCount ) : 
            this.replyIdsNotBlocking( msg.knownTxCount, msg.requestedTxCount )
        );
    }

    hasEventListeners(): boolean 
    {
        return this._hasEventListeners( this.eventListeners ) || this._hasEventListeners( this.onceEventListeners );
    }
    private _hasEventListeners( listeners: TxSubmitClientEvtListeners ): boolean 
    {
        return (
            listeners.requestIds.length > 0     ||
            listeners.requestTxs.length > 0
        );
    }

    addEventListenerOnce<EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) : typeof self 
    {
        const listeners = this.onceEventListeners[ evt ];

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
        
        const listeners = this.eventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }
    addListener( evt: TxSubmitClientEvt, callback: ( data: any ) => void ): this
    {
        return this.on( evt, callback );
    }
    on( evt: TxSubmitClientEvt, callback: ( data: any ) => void ): this
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        listeners.push( callback );
        
        return this;
    }

    removeEventListener<EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        var listeners = this.eventListeners[evt];

        if( !Array.isArray( listeners ) ) return self;

        this.eventListeners[evt] = listeners.filter( fn => fn !== listener );
        this.onceEventListeners[evt] = this.onceEventListeners[evt].filter( fn => fn !== listener );

        return self;
    }
    removeListener( evt: TxSubmitClientEvt, callback: ( data: any ) => void )
    {
        return this.off( evt, callback );
    }
    off( evt: TxSubmitClientEvt, callback: ( data: any ) => void )
    {
        const listeners = this.eventListeners[ evt ];
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
        var listeners = this.eventListeners[ evt ]

        if( !listeners ) return true;

        for( const cb of listeners ) cb( msg );

        listeners = this.onceEventListeners[ evt ];
        var cb: TxSubmitClientEvtListener;

        while( cb = listeners.shift()! ) cb( msg );

        return true;
    }

    removeAllListeners( event?: TxSubmitClientEvt ): void
    {
        return this.clearListeners( event );
    }
    clearListeners( evt?: TxSubmitClientEvt ) : void
    {
        this._clearListeners( this.eventListeners, evt );
        this._clearListeners( this.onceEventListeners, evt );
    }
    private _clearListeners( listeners: TxSubmitClientEvtListeners, evt?: TxSubmitClientEvt ) : void
    {
        if( isTxSubClientEvtName( evt ) )
        {
            listeners[ evt ] = [];
        }
        else
        {
            for( const key in listeners )
            {
                if( listeners.hasOwnProperty(key) ) 
                {
                    listeners[key as TxSubmitClientEvt] = [];
                }
            }
        }
    }
    
    // tx-submission client messages

    async replyTxs( askedIdsHashes: MempoolTxHash[] ): Promise<void>
    {
        const mempoolTxs = await this.mempool.getTxs( askedIdsHashes );
        const response = mempoolTxs.map(( memTx ) => ( new Uint8Array( memTx.hash ) )) as Uint8Array[];
        
        this.multiplexer.send(
            new TxSubmitReplyTxs({ txs: response }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.TxSubmission 
            }
        );
    }

    async replyIdsBlocking( knownTxCount: number, requestedTxCount: number ): Promise< void >
    {
        const numberOfTryings = 2;          // number of tryings
        const timeBetweenTryings = 10;      // time in seconds

        var txCount;

        for( var i = 0; i < numberOfTryings; i++ )
        {
            txCount = await this.mempool.getTxCount();
            
            if( txCount > 0 ) 
            {
                this.replyIdsNotBlocking( knownTxCount, requestedTxCount );
                return Promise.resolve();
            }

            setTimeout( () => {}, timeBetweenTryings * 1000 );
        }

        this.multiplexer.send( 
            new TxSubmitDone().toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.TxSubmission 
            }
        );
    }

    async replyIdsNotBlocking( knownTxCount: number, requestedTxCount: number ): Promise< void >
    {
        const hashesAndSizes = await this.mempool.getTxHashesAndSizes();
        
        const response = hashesAndSizes.map( 
            ( { hash, size }: TxHashAndSize ) => { 
                return { 
                    txId: new Uint8Array( hash.buffer ), 
                    txSize: size 
                };
            }
        ) as ITxIdAndSize[];

        const filteredResponse = response.slice( knownTxCount, knownTxCount + requestedTxCount );

        this.multiplexer.send( 
            new TxSubmitReplyIds({ response: filteredResponse }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.TxSubmission 
            }
        );
    }
}
