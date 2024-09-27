import { TxSubmitMessage, txSubmitMessageFromCborObj } from "./TxSubmitMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { TxSubmitRequestTxs } from "./messages/TxSubmitRequestTxs";
import { TxSubmitRequestIds } from "./messages/TxSubmitRequestIds";
import { ITxIdAndSize, TxSubmitDone, TxSubmitReplyIds, TxSubmitReplyTxs } from "./messages";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { Cbor, CborArray, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { IMempool, TxHashAndSize } from "./interfaces";
import { MempoolTxHash } from "./interfaces/types";

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

    once:                <EvtName extends TxSubmitClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this

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
    
            let msgStr: TxSubmitClientEvt;
    
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
        let listeners = this.eventListeners[evt];

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
        let listeners = this.eventListeners[ evt ]

        if( !listeners ) return true;

        for( const cb of listeners ) cb( msg );

        listeners = this.onceEventListeners[ evt ];
        let cb: TxSubmitClientEvtListener;

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

    replyTxs( askedIdsHashes: MempoolTxHash[] ): Promise< TxSubmitReplyTxs >
    {
        const self = this;

        return new Promise(( resolve ) => {
            var response: Uint8Array[] = [];

            function resolveReplyTxs( msg: TxSubmitReplyTxs )
            {
                self.removeEventListener( "requestIds", resolveReplyTxs );

                self.mempool.getTxs( askedIdsHashes ).then(( mempoolTxs ) => {
                    response = mempoolTxs.map(( memTx ) => ( new Uint8Array( memTx.hash ) )) as Uint8Array[];

                    resolve( msg );
                });
            }

            this.on( "requestTxs", resolveReplyTxs );
            
            this.multiplexer.send(
                new TxSubmitReplyTxs({ txs: response }).toCbor().toBuffer(),
                { 
                    hasAgency: true, 
                    protocol: MiniProtocol.TxSubmission 
                }
            );
        });
    }

    replyIds( oldIds: ITxIdAndSize[], reqCbor: CborObj ): Promise< TxSubmitReplyIds | TxSubmitDone >
    {
        const self = this;
        const req = TxSubmitRequestIds.fromCbor( reqCbor.toString() );

        return new Promise(( resolve ) => {            
            var response: ITxIdAndSize[] = oldIds;
            var done: boolean = false;
            
            async function resolveReplyIdsBlocking( msg: TxSubmitReplyIds )
            {
                var numberOfTryings = 2;    // it will try 2 times
                var txCount;

                for( let i = 0; i < numberOfTryings; i++ )
                {
                    txCount = await self.mempool.getTxCount();
                    
                    if( txCount > 0 ) 
                    {
                        resolveReplyIdsNotBlocking( msg );
                        return;
                    }

                    setTimeout( () => {}, 10000);   // it waits 10 seconds
                }

                done = true;
                self.removeEventListener( "requestIds", resolveReplyIdsBlocking );
                resolve( msg );
            }

            async function resolveReplyIdsNotBlocking( msg: TxSubmitReplyIds )
            {
                //TODO: atm it doesnt check duplicates!!!
                await self.mempool.getTxHashesAndSizes().then(( hashesAndSizes ) => {
                    response = response.concat( 
                        hashesAndSizes.map( 
                            ( { hash, size }: TxHashAndSize ) => { 
                                return { 
                                    txId: new Uint8Array( hash.buffer ), 
                                    txSize: size 
                                };
                            }
                        )
                    ) as ITxIdAndSize[];
                });

                self.removeEventListener( "requestIds", resolveReplyIdsBlocking );
                resolve( msg );
            }

            function reply( done: boolean )
            {
                return done ? 
                    new TxSubmitDone().toCbor().toBuffer()
                :
                    new TxSubmitReplyIds({ response }).toCbor().toBuffer();
            }

            this.on( "requestIds", req.blocking ? resolveReplyIdsBlocking : resolveReplyIdsNotBlocking );

            self.multiplexer.send( 
                reply( done ),
                { 
                    hasAgency: true, 
                    protocol: MiniProtocol.TxSubmission 
                }
            );
        });
    }
}
