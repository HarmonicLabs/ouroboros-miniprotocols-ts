import { BlockFetchMessage, blockFetchMessageFromCborObj, isBlockFetchMessage } from "./BlockFetchMessage";
import { BlockFetchClientDone, BlockFetchNoBlocks, BlockFetchRequestRange } from "./messages";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { IChainDb } from "../chain-sync/interfaces/IChainDb";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { CborObj, Cbor } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";

type BlockFetchServerEvtName     = keyof Omit<BlockFetchServerEvtListeners, "error">;
type AnyBlockFetchServerEvtName  = BlockFetchServerEvtName | "error";

type BlockFetchServerEvtListeners = {
    requestRange    : BlockFetchServerEvtListener[],
    done            : BlockFetchServerEvtListener[],
    error           : (( err: Error ) => void)[]
};

type BlockFetchServerEvtListener     = ( msg: BlockFetchMessage ) => void;
type AnyBlockFetchServerEvtListener  = BlockFetchServerEvtListener | (( err: Error ) => void);

type MsgOf<EvtName extends AnyBlockFetchServerEvtName> =
    EvtName extends "requestRange"  ? BlockFetchRequestRange    :
    EvtName extends "done"          ? BlockFetchClientDone      :
    EvtName extends "error"         ? Error                     :
    never                                                       ;

function msgToName( msg: BlockFetchMessage ): BlockFetchServerEvtName | undefined
{
    if( msg instanceof BlockFetchRequestRange )       return "requestRange" ;
    if( msg instanceof BlockFetchClientDone )         return "done"         ;
    
    return undefined;
}

function isAnyBlockFetchServerEvtName( str: any ): str is AnyBlockFetchServerEvtName
{
    return isBlockFetchServerEvtName( str ) || str === "error";
}
function isBlockFetchServerEvtName( str: any ): str is BlockFetchServerEvtName
{
    return (
        str === "requestRange"  ||
        str === "done"
    );
}

type EvtListenerOf<EvtName extends AnyBlockFetchServerEvtName> =
    EvtName extends "requestRange"  ? ( msg: BlockFetchRequestRange )   => void :
    EvtName extends "done"          ? ( msg: BlockFetchClientDone )     => void :
    never                                                                       ;

export class BlockFetchServer
{
    readonly multiplexer: Multiplexer;
    readonly chainDb: IChainDb;

    private eventListeners: BlockFetchServerEvtListeners = Object.freeze({
        requestRange:   [],
        done:           [],
        error:          []
    });

    private onceEventListeners: BlockFetchServerEvtListeners = Object.freeze({
        requestRange:   [],
        done:           [],
        error:          []
    });
    
    constructor( 
        thisMultiplexer: Multiplexer,
        thisChainDb: IChainDb
    )
    {
        this.multiplexer = thisMultiplexer;
        this.chainDb = thisChainDb;

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

            let msgStr: BlockFetchServerEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the Server

                this.dispatchEvent( msgStr, msg );
            }
        });

        this.on( "requestRange", ( msg: BlockFetchNoBlocks ) => this.handleRequestRange() );
        this.on( "done", ( msg: BlockFetchClientDone ) => this.handleDone() );
    }

    // block-fetch Server messages implementation
    
    private handleRequestRange()
    {
        // console.log( "requestRange" );
    }

    private handleDone()
    {
        // console.log( "done" );
    }

    // event listeners

    hasEventListeners(): boolean 
    {
        return( 
            this._hasEventListeners( this.eventListeners )      || 
            this._hasEventListeners( this.onceEventListeners )
        );
    }
    private _hasEventListeners( listeners: BlockFetchServerEvtListeners ): boolean 
    {
        return (
            listeners.requestRange.length   > 0     ||
            listeners.done.length           > 0     ||
            listeners.error.length          > 0
        );
    }

    addEventListenerOnce<EvtName extends BlockFetchServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) : typeof self 
    {
        if( !isAnyBlockFetchServerEvtName( evt ) ) return self;

        this.onceEventListeners[ evt ].push( listener as any );

        return self;
    }
    once<EvtName extends BlockFetchServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        return this.addEventListenerOnce( evt, listener );
    }
    addEventListener<EvtName extends BlockFetchServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ): typeof self 
    {
        if( options?.once === true ) return this.addEventListenerOnce( evt, listener );
            
        if( !isAnyBlockFetchServerEvtName( evt ) ) return self;
        
        this.eventListeners[ evt ].push( listener as any );

        return self;
    }

    on( evt: AnyBlockFetchServerEvtName, callback: ( data: any ) => void ): this
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        listeners.push( callback );
        
        return this;
    }
    addListener( evt: BlockFetchServerEvtName, callback: ( data: any ) => void ): this
    {
        return this.on( evt, callback );
    }

    removeEventListener<EvtName extends BlockFetchServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        if( !isAnyBlockFetchServerEvtName( evt ) ) return self;

        this.eventListeners[evt] = this.eventListeners[evt].filter( fn => fn !== listener ) as any;
        this.onceEventListeners[evt] = this.onceEventListeners[evt].filter( fn => fn !== listener ) as any;
        
        return self; 
    }

    off( evt: BlockFetchServerEvtName, callback: ( data: any ) => void )
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        const idx = listeners.findIndex(( cb ) => callback === cb );
        if( idx < 0 ) return this;

        void listeners.splice( idx, 1 );

        return this;
    }
    removeListener( evt: BlockFetchServerEvtName, callback: ( data: any ) => void )
    {
        return this.off( evt, callback );
    }

    dispatchEvent( evt: AnyBlockFetchServerEvtName, msg: BlockFetchMessage | Error ) : boolean
    {
        if( !isAnyBlockFetchServerEvtName( evt ) ) return true;
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
    emit<EvtName extends BlockFetchServerEvtName>( evt: EvtName, msg: MsgOf<EvtName> ): boolean
    {
        return this.dispatchEvent( evt, msg );
    }

    private _clearListeners( listeners: BlockFetchServerEvtListeners, evt?: BlockFetchServerEvtName ) : void
    {
        if( isAnyBlockFetchServerEvtName( evt ) )
        {
            listeners[ evt ] = [];
        }
        else
        {
            for( const key in listeners )
            {
                if( listeners.hasOwnProperty( key ) ) 
                {
                    listeners[ key as BlockFetchServerEvtName ] = [];
                }
            }
        }
    }
    clearListeners( evt?: BlockFetchServerEvtName ) : void
    {
        this._clearListeners( this.eventListeners, evt );
        this._clearListeners( this.onceEventListeners, evt );
    }
    removeAllListeners( event?: BlockFetchServerEvtName ): void
    {
        return this.clearListeners( event );
    }
}
