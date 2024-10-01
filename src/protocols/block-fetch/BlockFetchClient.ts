import { BlockFetchMessage, blockFetchMessageFromCborObj } from "./BlockFetchMessage";
import { BlockFetchRequestRange } from "./messages/BlockFetchRequestRange";
import { BlockFetchClientDone } from "./messages/BlockFetchClientDone";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { BlockFetchBatchDone } from "./messages/BlockFetchBatchDone";
import { BlockFetchNoBlocks } from "./messages/BlockFetchNoBlocks";
import { IChainPoint, isOriginPoint } from "../types/ChainPoint";
import { BlockFetchBlock } from "./messages/BlockFetchBlock";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";

type BlockFetchClientEvt = keyof BlockFetchClientEvtListeners & string;

type BlockFetchClientEvtListeners = {
    noBlocks:   BlockFetchClientEvtListener[],
    batchDone:  BlockFetchClientEvtListener[],
    // error:      ( err: Error ) => void
};

type BlockFetchClientEvtListener = ( msg: BlockFetchMessage ) => void;

type MsgOf<EvtName extends BlockFetchClientEvt> =
    EvtName extends "noBlocks"      ? BlockFetchNoBlocks    :
    EvtName extends "batchDone"     ? BlockFetchBatchDone   :
    never                                                   ;

function msgToName( msg: BlockFetchMessage ): BlockFetchClientEvt | undefined 
{
    if( msg instanceof BlockFetchNoBlocks   )       return "noBlocks";
    if( msg instanceof BlockFetchBatchDone  )       return "batchDone";

    return undefined;
}

function isTxSubClientEvtName( stuff: any ): stuff is BlockFetchClientEvt
{
    return (
        stuff === "noBlocks"            ||
        stuff === "batchDone"
    );
}

export type BlockFetchResult = { ok: true, msg: undefined } | { ok: false, msg: bigint }

type EvtListenerOf<Evt extends BlockFetchClientEvt> = ( ...args: any[] ) => any

export class BlockFetchClient
{
    readonly _multiplexer: Multiplexer;
    get multiplexer(): Multiplexer 
    {
        return this._multiplexer;
    }

    private _eventListeners: BlockFetchClientEvtListeners = Object.freeze({
        noBlocks:       [],
        batchDone:      [],
        // error:          ( err: Error ) => {}
    });
    get eventListeners(): BlockFetchClientEvtListeners 
    {
        return this._eventListeners;
    }

    private _onceEventListeners: BlockFetchClientEvtListeners = Object.freeze({
        noBlocks:       [],
        batchDone:      [],
        // error:          ( err: Error ) => {}
    });
    get onceEventListeners(): BlockFetchClientEvtListeners 
    {
        return this._onceEventListeners;
    }
    
    constructor( thisMultiplexer: Multiplexer )
    {
        this._multiplexer = thisMultiplexer;

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: BlockFetchMessage[] = [];

        this.multiplexer.on( MiniProtocol.BlockFetch, ( chunk ) => {
            if( !this.hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: BlockFetchMessage;

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
                // finally {
                //     Error.stackTraceLimit = originalSTLimit;
                // }

                offset = thing.offset;

                try {
                    msg = blockFetchMessageFromCborObj( thing.parsed );
                    
                    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
                    msg.cborBytes = Uint8Array.prototype.slice.call( chunk, 0, offset );

                    queque.unshift( msg );
                }
                catch( e )
                {
                    // before dispatch event
                    Error.stackTraceLimit = originalSTLimit;

                    // console.error("-------------------------------------------------------");
                    // console.error( "dbg_chunk", toHex( dbg_chunk ) );
                    // console.error( "dbg_prev", dbg_prev ? toHex( dbg_prev ) : dbg_prev );
                    // console.error("-------------------------------------------------------");
                    const err = new Error(
                        ( typeof e?.message === "string" ? e.message : "" ) +
                        "\ndata: " + toHex( chunk ) + "\n"
                    );
                    
                    // this.dispatchEvent( "error", err );
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

            let msgStr: BlockFetchClientEvt;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;

                // ingore messages not expected by the client
                if( !msgStr ) continue; 

                this.dispatchEvent( msgStr, msg );
            }

        });
    }

    hasEventListeners(): boolean 
    {
        return this._hasEventListeners( this.eventListeners ) || this._hasEventListeners( this.onceEventListeners );
    }
    private _hasEventListeners( listeners: BlockFetchClientEvtListeners ): boolean 
    {
        return (
            listeners.noBlocks.length   > 0       ||
            listeners.batchDone.length  > 0
        );
    }

    addEventListenerOnce<EvtName extends BlockFetchClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) : typeof self 
    {
        const listeners = this.onceEventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }
    once<EvtName extends BlockFetchClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        return this.addEventListenerOnce( evt, listener );
    }

    addEventListener<EvtName extends BlockFetchClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ): typeof self 
    {
        if( options?.once ) return this.addEventListenerOnce( evt, listener );
        
        const listeners = this.eventListeners[ evt ];

        if( !Array.isArray( listeners ) ) return self;

        listeners.push( listener );

        return self;
    }
    addListener( evt: BlockFetchClientEvt, callback: ( data: any ) => void ): this
    {
        return this.on( evt, callback );
    }
    on( evt: BlockFetchClientEvt, callback: ( data: any ) => void ): this
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        listeners.push( callback );
        
        return this;
    }

    removeEventListener<EvtName extends BlockFetchClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        var listeners = this.eventListeners[evt];

        if( !Array.isArray( listeners ) ) return self;

        this.eventListeners[ evt ] = listeners.filter( fn => fn !== listener );
        this.onceEventListeners[ evt ] = this.onceEventListeners[evt].filter( fn => fn !== listener );

        return self;
    }
    removeListener( evt: BlockFetchClientEvt, callback: ( data: any ) => void )
    {
        return this.off( evt, callback );
    }
    off( evt: BlockFetchClientEvt, callback: ( data: any ) => void )
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        const idx = listeners.findIndex(( cb ) => callback === cb );
        if( idx < 0 ) return this;

        void listeners.splice( idx, 1 );

        return this;
    }

    emit<EvtName extends BlockFetchClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ): boolean
    {
        return this.dispatchEvent( evt, msg );
    }
    dispatchEvent( evt: BlockFetchClientEvt, msg: BlockFetchMessage ) : boolean
    {
        var listeners = this.eventListeners[ evt ]

        if( !listeners ) return true;

        for( const cb of listeners ) cb( msg );

        listeners = this.onceEventListeners[ evt ];
        var cb: BlockFetchClientEvtListener;

        while( cb = listeners.shift()! ) cb( msg );

        return true;
    }

    removeAllListeners( evt?: BlockFetchClientEvt ): void
    {
        return this.clearListeners( evt );
    }
    clearListeners( evt?: BlockFetchClientEvt ) : void
    {
        this._clearListeners( this.eventListeners, evt );
        this._clearListeners( this.onceEventListeners, evt );
    }
    private _clearListeners( listeners: BlockFetchClientEvtListeners, evt?: BlockFetchClientEvt ) : void
    {
        if( isTxSubClientEvtName( evt ) )
        {
            listeners[ evt ] = [];
        }
        else
        {
            for( const key in listeners )
            {
                if( listeners.hasOwnProperty( key ) ) 
                {
                    listeners[ key as BlockFetchClientEvt ] = [];
                }
            }
        }
    }

    // block fetch client messages

    /** request a single block from peer */
    request( point: IChainPoint ): Promise<BlockFetchNoBlocks | BlockFetchBlock>
    {
        return this.requestRange(point, point)
        .then( result => Array.isArray(result) ? result[0] : result );
    }

    requestRange( from: IChainPoint, to: IChainPoint ): Promise<BlockFetchNoBlocks | BlockFetchBlock[]>
    {
        if( isOriginPoint( from ) || isOriginPoint( to ) )
        {
            // this.dispatchEvent(
            //     "error",
            //     new Error(
            //         "trying to request origin point; " +
            //         "The Genesis Block exsists as a concept, but not really in a node database; " +
            //         "BlockFetchClient::requestRange will resolve with `BlockFetchNoBlocks`; " +
            //         "try with the first real block point"
            //     )
            // );

            return Promise.resolve( new BlockFetchNoBlocks() );
        }

        const self = this;
        const blocks: BlockFetchBlock[] = [];
        return new Promise( resolve => {
            function resolveBatch( _msg: BlockFetchBatchDone )
            {
                self.removeEventListener("noBlocks", resolveNoBlocks);
                self.removeEventListener("batchDone", resolveBatch);
                self.removeEventListener("block", handleBlock);

                if( blocks.length > 0 ) resolve( blocks );
                else resolve( new BlockFetchNoBlocks() );
                return;
            }
            function resolveNoBlocks( msg: BlockFetchNoBlocks )
            {
                self.removeEventListener("noBlocks", resolveNoBlocks);
                self.removeEventListener("batchDone", resolveBatch);
                self.removeEventListener("block", handleBlock);

                resolve( msg );
                return;
            }
            // function handleStartBatch( msg: BlockFetchStartBatch ) {}
            function handleBlock( msg: BlockFetchBlock )
            {
                blocks.push( msg );
            }

            self.once("noBlocks", resolveNoBlocks);
            self.once("batchDone", resolveBatch);
            self.on("block", handleBlock);

            self.mplexer.send(
                new BlockFetchRequestRange({ from, to }).toCbor().toBuffer(),
                {
                    hasAgency: true,
                    protocol: MiniProtocol.BlockFetch
                }
            );
        });
    }

    done(): void
    {
        this.mplexer.send(
            new BlockFetchClientDone().toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: MiniProtocol.BlockFetch
            }
        );
        this.clearListeners()
    }
}