import { BlockFetchBatchDone, BlockFetchBlock, BlockFetchNoBlocks, BlockFetchStartBatch } from "./messages";
import { BlockFetchMessage, blockFetchMessageFromCborObj, isBlockFetchMessage } from "./BlockFetchMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { CborObj, Cbor } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";

type BlockFetchClientEvtName     = keyof Omit<BlockFetchClientEvtListeners, "error">;
type AnyBlockFetchClientEvtName  = BlockFetchClientEvtName | "error";

type BlockFetchClientEvtListeners = {
    noBlocks        : BlockFetchClientEvtListener[],
    startBatch      : BlockFetchClientEvtListener[],
    block           : BlockFetchClientEvtListener[],
    batchDone       : BlockFetchClientEvtListener[],
    error           : (( err: Error ) => void)[]
};

type BlockFetchClientEvtListener     = ( msg: BlockFetchMessage ) => void;
type AnyBlockFetchClientEvtListener  = BlockFetchClientEvtListener | (( err: Error ) => void);

type MsgOf<EvtName extends AnyBlockFetchClientEvtName> =
    EvtName extends "noBlocks"      ? BlockFetchNoBlocks    :
    EvtName extends "startBatch"    ? BlockFetchStartBatch  :
    EvtName extends "block"         ? BlockFetchBlock       :
    EvtName extends "batchDone"     ? BlockFetchBatchDone   :
    EvtName extends "error"         ? Error                 :
    never                                                   ;

function msgToName( msg: BlockFetchMessage ): BlockFetchClientEvtName | undefined
{
    if( msg instanceof BlockFetchNoBlocks )       return "noBlocks"    ;
    if( msg instanceof BlockFetchStartBatch )     return "startBatch"  ;
    if( msg instanceof BlockFetchBlock )          return "block"       ;
    if( msg instanceof BlockFetchBatchDone )      return "batchDone"   ;
    
    return undefined;
}

function isAnyBlockFetchClientEvtName( str: any ): str is AnyBlockFetchClientEvtName
{
    return isBlockFetchClientEvtName( str ) || str === "error";
}
function isBlockFetchClientEvtName( str: any ): str is BlockFetchClientEvtName
{
    return (
        str === "noBlocks"       ||
        str === "startBatch"     ||
        str === "block"          ||
        str === "batchDone"
    );
}

type EvtListenerOf<EvtName extends AnyBlockFetchClientEvtName> =
    EvtName extends "noBlocks"   ? ( msg: BlockFetchNoBlocks )   => void :
    EvtName extends "startBatch" ? ( msg: BlockFetchStartBatch ) => void :
    EvtName extends "block"      ? ( msg: BlockFetchBlock )      => void :
    EvtName extends "batchDone"  ? ( msg: BlockFetchBatchDone )  => void :
    EvtName extends "error"      ? ( err: Error )                => void :  
    never                                                                ;

export class BlockFetchClient
{
    readonly multiplexer: Multiplexer;

    private eventListeners: BlockFetchClientEvtListeners = Object.freeze({
        noBlocks:        [],
        startBatch:      [],
        block:           [],
        batchDone:       [],
        error:           []
    });

    private onceEventListeners: BlockFetchClientEvtListeners = Object.freeze({
        noBlocks:        [],
        startBatch:      [],
        block:           [],
        batchDone:       [],
        error:           []
    });
    
    constructor( thisMultiplexer: Multiplexer )
    {
        this.multiplexer = thisMultiplexer;

        // handle muliplexer messages s
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
                try
                {
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
                try 
                {
                    msg = blockFetchMessageFromCborObj( thing.parsed );
                    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
                    msg.cborBytes = Uint8Array.prototype.slice.call( chunk, 0, offset );
                    
                    queque.unshift( msg );
                }
                catch( e )
                {
                    // before dispatch event
                    Error.stackTraceLimit = originalSTLimit;

                    const err = new Error(
                        typeof e?.message === "string" ? e.message : "" +
                        "\ndata: " + toHex( chunk ) + "\n"
                    );
                    
                    this.dispatchEvent( "error", err );
                }
                finally 
                {
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

            let msgStr: BlockFetchClientEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the Client

                this.dispatchEvent( msgStr, msg );
            }
        });

        this.on( "noBlocks", ( msg: BlockFetchNoBlocks ) => this.handleNoBlocks() );
        this.on( "startBatch", ( msg: BlockFetchStartBatch ) => this.handleStartBatch() );
        this.on( "block", ( msg: BlockFetchBlock ) => this.handleBlock( msg ) );
        this.on( "batchDone", ( msg: BlockFetchBatchDone ) => this.handleBatchDone() );
    }

    // block-fetch Client messages implementation
    
    private handleNoBlocks()
    {
        // console.log( "noBlocks" );
    }

    private handleStartBatch()
    {
        // console.log( "startBatch" );
    }

    private handleBlock( msg: BlockFetchBlock )
    {
        // console.log( "block", msg.block );
    }

    private handleBatchDone()
    {
        // console.log( "batchDone" );
    }

    // event listeners

    hasEventListeners(): boolean 
    {
        return( 
            this._hasEventListeners( this.eventListeners )      || 
            this._hasEventListeners( this.onceEventListeners )
        );
    }
    private _hasEventListeners( listeners: BlockFetchClientEvtListeners ): boolean 
    {
        return (
            listeners.noBlocks.length    > 0     ||
            listeners.startBatch.length  > 0     ||
            listeners.block.length       > 0     ||
            listeners.batchDone.length   > 0     ||
            listeners.error.length       > 0
        );
    }

    addEventListenerOnce<EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) : typeof self 
    {
        if( !isAnyBlockFetchClientEvtName( evt ) ) return self;

        this.onceEventListeners[ evt ].push( listener as any );

        return self;
    }
    once<EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        return this.addEventListenerOnce( evt, listener );
    }
    addEventListener<EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ): typeof self 
    {
        if( options?.once === true ) return this.addEventListenerOnce( evt, listener );
            
        if( !isAnyBlockFetchClientEvtName( evt ) ) return self;
        
        this.eventListeners[ evt ].push( listener as any );

        return self;
    }

    on( evt: AnyBlockFetchClientEvtName, callback: ( data: any ) => void ): this
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        listeners.push( callback );
        
        return this;
    }
    addListener( evt: BlockFetchClientEvtName, callback: ( data: any ) => void ): this
    {
        return this.on( evt, callback );
    }

    removeEventListener<EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        if( !isAnyBlockFetchClientEvtName( evt ) ) return self;

        this.eventListeners[evt] = this.eventListeners[evt].filter( fn => fn !== listener ) as any;
        this.onceEventListeners[evt] = this.onceEventListeners[evt].filter( fn => fn !== listener ) as any;
        
        return self; 
    }

    off( evt: BlockFetchClientEvtName, callback: ( data: any ) => void )
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        const idx = listeners.findIndex(( cb ) => callback === cb );
        if( idx < 0 ) return this;

        void listeners.splice( idx, 1 );

        return this;
    }
    removeListener( evt: BlockFetchClientEvtName, callback: ( data: any ) => void )
    {
        return this.off( evt, callback );
    }

    dispatchEvent( evt: AnyBlockFetchClientEvtName, msg: BlockFetchMessage | Error ) : boolean
    {
        if( !isAnyBlockFetchClientEvtName( evt ) ) return true;
        if( evt !== "error" && !isBlockFetchMessage( msg ) ) return true;

        const listeners = this.eventListeners[ evt ];
        const nListeners = listeners.length;
        for(let i = 0; i < nListeners; i++)
        {
            listeners[i](msg as any);
        }

        const onceListeners = this.onceEventListeners[evt];
        while( onceListeners.length > 0 )
        {
            onceListeners.shift()!(msg as any);
        }

        return true;
    }
    emit<EvtName extends BlockFetchClientEvtName>( evt: EvtName, msg: MsgOf<EvtName> ): boolean
    {
        return this.dispatchEvent( evt, msg );
    }

    private _clearListeners( listeners: BlockFetchClientEvtListeners, evt?: BlockFetchClientEvtName ) : void
    {
        if( isAnyBlockFetchClientEvtName( evt ) )
        {
            listeners[ evt ] = [];
        }
        else
        {
            for( const key in listeners )
            {
                if( listeners.hasOwnProperty( key ) ) 
                {
                    listeners[ key as BlockFetchClientEvtName ] = [];
                }
            }
        }
    }
    clearListeners( evt?: BlockFetchClientEvtName ) : void
    {
        this._clearListeners( this.eventListeners, evt );
        this._clearListeners( this.onceEventListeners, evt );
    }
    removeAllListeners( event?: BlockFetchClientEvtName ): void
    {
        return this.clearListeners( event );
    }
}
