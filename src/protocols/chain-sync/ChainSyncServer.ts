import { ChainSyncAwaitReply, ChainSyncFindIntersect, ChainSyncIntersectFound, ChainSyncIntersectNotFound, ChainSyncMessageDone, ChainSyncRequestNext, ChainSyncRollBackwards, ChainSyncRollForward } from "./messages";
import { ChainSyncMessage, isChainSyncMessage, chainSyncMessageFromCborObj } from "./ChainSyncMessage";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { ChainPoint, IChainPoint } from "../types/ChainPoint";
import { IChainDb } from "./interfaces/IChainDb";
import { IChainTip } from "../types";

type ChainSyncServerEvtName     = keyof Omit<ChainSyncServerEvtListeners, "error">;
type AnyChainSyncServerEvtName  = ChainSyncServerEvtName | "error";

type ChainSyncServerEvtListeners = {
    requestNext     : ChainSyncServerEvtListener[]
    findIntersect   : ChainSyncServerEvtListener[],
    done            : ChainSyncServerEvtListener[],
    error           : (( err: Error ) => void)[]
};

type ChainSyncServerEvtListener     = ( msg: ChainSyncMessage ) => void;
type AnyChainSyncServerEvtListener  = ChainSyncServerEvtListener | (( err: Error ) => void);

type MsgOf<EvtName extends AnyChainSyncServerEvtName> =
    EvtName extends "requestNext"           ? ChainSyncRequestNext      :
    EvtName extends "findIntersect"         ? ChainSyncFindIntersect    :
    EvtName extends "done"                  ? ChainSyncMessageDone      :
    EvtName extends "error"                 ? Error                     :
    never;

function msgToName( msg: ChainSyncMessage ): ChainSyncServerEvtName | undefined
{
    if( msg instanceof ChainSyncRequestNext )       return "requestNext"    ;
    if( msg instanceof ChainSyncFindIntersect )     return "findIntersect"  ;
    if( msg instanceof ChainSyncMessageDone )       return "done"           ;

    return undefined;
}

function isAnyChainSyncServerEvtName( str: any ): str is AnyChainSyncServerEvtName
{
    return isChainSyncServerEvtName( str ) || str === "error";
}
function isChainSyncServerEvtName( str: any ): str is ChainSyncServerEvtName
{
    return (
        str === "requestNext"       ||
        str === "findIntersect"     ||
        str === "done"
    );
}

type EvtListenerOf<EvtName extends AnyChainSyncServerEvtName> =
    EvtName extends "requestNext"   ? ( msg: ChainSyncRollBackwards )   => void :
    EvtName extends "findIntersect" ? ( msg: ChainSyncRollForward )     => void :
    EvtName extends "done"          ? ( msg: ChainSyncIntersectFound)   => void :
    EvtName extends "error"         ? ( err: Error )                    => void :  
    never                                                                       ;

export class ChainSyncServer
{
    readonly _multiplexer: Multiplexer;
    get multiplexer(): Multiplexer 
    {
        return this._multiplexer;
    }

    readonly _chainDb: IChainDb;
    get chainDb(): IChainDb 
    {
        return this._chainDb;
    }

    private _eventListeners: ChainSyncServerEvtListeners = Object.freeze({
        requestNext:        [],
        findIntersect:      [],
        done:               [],
        error:              []
    });
    get eventListeners(): ChainSyncServerEvtListeners 
    {
        return this._eventListeners;
    }

    private _onceEventListeners: ChainSyncServerEvtListeners = Object.freeze({
        requestNext:        [],
        findIntersect:      [],
        done:               [],
        error:              []
    });
    get onceEventListeners(): ChainSyncServerEvtListeners 
    {
        return this._onceEventListeners;
    }
    
    constructor(
        thisMultiplexer: Multiplexer,
        thisChainDb: IChainDb
    )
    {
        this._multiplexer = thisMultiplexer;
        this._chainDb = thisChainDb;

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: ChainSyncMessage[] = [];

        this.multiplexer.on( MiniProtocol.ChainSync, ( chunk ) => {
            if( !this.hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: ChainSyncMessage;

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
                    msg = chainSyncMessageFromCborObj( thing.parsed );
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

            let msgStr: ChainSyncServerEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the Server

                this.dispatchEvent( msgStr, msg );
            }
        });

        this.currentBlockNo = Number( this.chainDb.volatileDb.tip.blockNo );

        this.on("requestNext", ( msg: ChainSyncRequestNext ) => this.handleRequestNext() );
        this.on("findIntersect", ( msg: ChainSyncFindIntersect ) => this.handleFindIntersect( [...msg.points] ) );
        this.on("done", ( msg: ChainSyncMessageDone ) => {} );
    }

    hasEventListeners(): boolean 
    {
        return( 
            this._hasEventListeners( this.eventListeners )      || 
            this._hasEventListeners( this.onceEventListeners )
        );
    }
    private _hasEventListeners( listeners: ChainSyncServerEvtListeners ): boolean 
    {
        return (
            listeners.requestNext.length    > 0     ||
            listeners.findIntersect.length  > 0     ||
            listeners.error.length          > 0
        );
    }

    addEventListenerOnce<EvtName extends ChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) : typeof self 
    {
        if( !isAnyChainSyncServerEvtName( evt ) ) return self;

        this.onceEventListeners[ evt ].push( listener as any );

        return self;
    }

    once<EvtName extends ChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        return this.addEventListenerOnce( evt, listener );
    }

    addEventListener<EvtName extends ChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ): typeof self 
    {
        if( options?.once === true ) return this.addEventListenerOnce( evt, listener );
            
        if( !isAnyChainSyncServerEvtName( evt ) ) return self;
        
        this.eventListeners[ evt ].push( listener as any );

        return self;
    }

    addListener( evt: ChainSyncServerEvtName, callback: ( data: any ) => void ): this
    {
        return this.on( evt, callback );
    }
    on( evt: AnyChainSyncServerEvtName, callback: ( data: any ) => void ): this
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        listeners.push( callback );
        
        return this;
    }

    removeEventListener<EvtName extends ChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ): typeof self 
    {
        if( !isAnyChainSyncServerEvtName( evt ) ) return self;

        this.eventListeners[evt] = this.eventListeners[evt].filter( fn => fn !== listener ) as any;
        this.onceEventListeners[evt] = this.onceEventListeners[evt].filter( fn => fn !== listener ) as any;
        
        return self; 
    }

    removeListener( evt: ChainSyncServerEvtName, callback: ( data: any ) => void )
    {
        return this.off( evt, callback );
    }
    off( evt: ChainSyncServerEvtName, callback: ( data: any ) => void )
    {
        const listeners = this.eventListeners[ evt ];
        if( !listeners ) return this;

        const idx = listeners.findIndex(( cb ) => callback === cb );
        if( idx < 0 ) return this;

        void listeners.splice( idx, 1 );

        return this;
    }

    emit<EvtName extends ChainSyncServerEvtName>( evt: EvtName, msg: MsgOf<EvtName> ): boolean
    {
        return this.dispatchEvent( evt, msg );
    }
    dispatchEvent( evt: AnyChainSyncServerEvtName, msg: ChainSyncMessage | Error ) : boolean
    {
        if( !isAnyChainSyncServerEvtName( evt ) ) return true;
        if( evt !== "error" && !isChainSyncMessage( msg ) ) return true;

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

    removeAllListeners( event?: ChainSyncServerEvtName ): void
    {
        return this.clearListeners( event );
    }
    clearListeners( evt?: ChainSyncServerEvtName ) : void
    {
        this._clearListeners( this.eventListeners, evt );
        this._clearListeners( this.onceEventListeners, evt );
    }
    private _clearListeners( listeners: ChainSyncServerEvtListeners, evt?: ChainSyncServerEvtName ) : void
    {
        if( isAnyChainSyncServerEvtName( evt ) )
        {
            listeners[ evt ] = [];
        }
        else
        {
            for( const key in listeners )
            {
                if( listeners.hasOwnProperty(key) ) 
                {
                    listeners[key as ChainSyncServerEvtName] = [];
                }
            }
        }
    }

    // chain-sync server messages implementation

    private currentBlockNo: number;

    handleRequestNext(): void
    {
        const point = this.chainDb.volatileDb.main[ this.currentBlockNo ];
    }
    replyAwaitReply( point: IChainPoint ): void
    {
        this.multiplexer.send(
            new ChainSyncAwaitReply().toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }
    replyRollForward( point: IChainPoint ): void
    {
        this.updateCurrentBlockNo( -1 );

        this.multiplexer.send(
            new ChainSyncRollForward().toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }
    replyRollBackwards( point: IChainPoint ): void
    {
        this.updateCurrentBlockNo( +1 );

        this.multiplexer.send(
            new ChainSyncRollBackwards({
                point: this.chainDb.volatileDb.hashToBlockData( ),
                tip: this.chainDb.volatileDb.tip
            }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }

    async handleFindIntersect( points: ChainPoint[] ): Promise<void>
    {
        // to be sure we order the points from higher to lower slotNumber
        points.sort((a, b) => {
            if (!b.blockHeader || !a.blockHeader) return 0;

            const slotNumberA = typeof a.blockHeader.slotNumber === 'bigint' ? Number(a.blockHeader.slotNumber) : a.blockHeader.slotNumber;
            const slotNumberB = typeof b.blockHeader.slotNumber === 'bigint' ? Number(b.blockHeader.slotNumber) : b.blockHeader.slotNumber;
            
            return slotNumberB - slotNumberA;
        })
        
        // last generated point of the main chain (IChainDb handled)
        const tip = this.chainDb.volatileDb.tip;

        var pastBlockCounter = 0;
        
        for( const point of points )
        {
            var intersect = await this.chainDb.volatileDb.findIntersect( tip.point, point );
            
            if( intersect )
            {
                this.updateCurrentBlockNo( pastBlockCounter, intersect );

                this.replyIntersectFound( intersect, tip );
                break;
            }

            pastBlockCounter++;
        }
        
        this.replyIntersectNotFound( tip );
    }
    replyIntersectFound( point: IChainPoint, tip: IChainTip ): void
    {
        this.multiplexer.send(
            new ChainSyncIntersectFound({ point, tip }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }
    replyIntersectNotFound( tip: IChainTip ): void
    {
        this.multiplexer.send(
            new ChainSyncIntersectNotFound({ tip }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }

    // pastBlockCounter is > 0 for rollBackwars and < 0 for rollForward
    private updateCurrentBlockNo( pastBlockCounter: number, point?: IChainPoint ): void
    {
        if( point && point.blockHeader )
        {
            this.currentBlockNo = this.chainDb.volatileDb.hashToBlockData( point.blockHeader.hash ).blockNo;
        }
        else
        {
            // not a really nice solution but it works since every point is generated in sequence,
            // slotNumber is incremental and points is ordered from higher to lower slotNumber
            this.currentBlockNo = this.currentBlockNo - pastBlockCounter;
        }
    }
}
