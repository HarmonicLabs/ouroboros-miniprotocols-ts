import { ChainSyncAwaitReply, ChainSyncFindIntersect, ChainSyncIntersectFound, ChainSyncIntersectNotFound, ChainSyncMessageDone, ChainSyncRequestNext, ChainSyncRollBackwards, ChainSyncRollForward } from "./messages";
import { ChainSyncMessage, isChainSyncMessage, chainSyncMessageFromCborObj } from "./ChainSyncMessage";
import { Cbor, CborBytes, CborObj, CborTag } from "@harmoniclabs/cbor";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { ChainPoint, IChainPoint } from "../types/ChainPoint";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { MiniProtocol } from "../../MiniProtocol";
import { IChainDb, IExtendData } from "./interfaces/IChainDb";
import { ChainTip, IChainTip } from "../types";

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
    readonly multiplexer: Multiplexer;
    readonly chainDb: IChainDb;

    private clientIndex: bigint;
    private tip: ChainTip;
    private prevIntersectPoint: ChainPoint | undefined;
    private synced: boolean;

    private eventListeners: ChainSyncServerEvtListeners = Object.freeze({
        requestNext:        [],
        findIntersect:      [],
        done:               [],
        error:              []
    });

    private onceEventListeners: ChainSyncServerEvtListeners = Object.freeze({
        requestNext:        [],
        findIntersect:      [],
        done:               [],
        error:              []
    });
    
    constructor(
        thisMultiplexer: Multiplexer,
        thisChainDb: IChainDb
    )
    {
        this.multiplexer = thisMultiplexer;
        this.chainDb = thisChainDb;

        // server state
        this.clientIndex = BigInt(0);

        this.tip = new ChainTip({ point: ChainPoint.origin, blockNo: 0 });
        this.chainDb.getTip().then(( tip ) => { 
            this.tip = new ChainTip( tip ) 
        });

        this.prevIntersectPoint = undefined;
        this.synced = false;

        // handle muliplexer messages s
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

        this.on("requestNext", ( msg: ChainSyncRequestNext ) => this.handleReqNext() );
        this.on("findIntersect", ( msg: ChainSyncFindIntersect ) => this.handleFindIntersect( [...msg.points] ) );
        this.on("done", ( msg: ChainSyncMessageDone ) => { console.log(" ciaone! ") } );
    }

    // chain-sync server messages implementation
    
    async handleFindIntersect( points: ChainPoint[] ): Promise<void>
    {
        const intersection = await this.chainDb.findIntersect( ...points );
        const tip = await this.chainDb.getTip();

        if( !intersection )
        {
            this.sendIntersectNotFound( tip );
            return
        }

        const { point, blockNo } = new ChainTip( intersection );

        this.clientIndex = BigInt(blockNo);

        this.prevIntersectPoint = point;
        this.sendIntersectFound( point, tip );
    }
    /**
     * @pure
     */
    sendIntersectFound( point: IChainPoint, tip: IChainTip ): void
    {
        this.multiplexer.send(
            new ChainSyncIntersectFound({ point, tip }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }
    /**
     * @pure
     */
    sendIntersectNotFound( tip: IChainTip ): void
    {
        this.multiplexer.send(
            new ChainSyncIntersectNotFound({ tip }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }

    async handleReqNext(): Promise<void>
    {
        const tip = await this.chainDb.getTip();

        if( this.prevIntersectPoint !== undefined )
        {
            const point = this.prevIntersectPoint;
            this.prevIntersectPoint = undefined;
            this.sendRollBackwards( point, tip );
            return;
        }

        if( !ChainTip.eq( this.tip, tip ) )
        {
            const intersection = await this.chainDb.findIntersect( this.tip.point, tip.point );
            if( !intersection ) throw new Error("expected intersection not found");
            
            this.clientIndex = BigInt( intersection.blockNo );

            this.sendRollBackwards( intersection.point, tip );
            return;
        }

        const self = this;

        async function handleFork( extendData: IExtendData )
        {
            const { tip: newTip, intersection } = extendData;

            self.chainDb.off( "extend", handleExtend );
            self.chainDb.off( "fork"  , handleFork );
            
        }
        
        // we'll send either a "RollBackwards" or a "RollForward"
        async function handleExtend( extendData: IExtendData )
        {
            const { tip: newTip, intersection } = extendData;

            self.chainDb.off( "extend", handleExtend );
            self.chainDb.off( "fork"  , handleFork );

            if( !ChainTip.eq( self.tip, newTip ) )
            {
                const intersection = await self.chainDb.findIntersect( self.tip.point, newTip.point );
                if( !intersection ) throw new Error("expected intersection not found");
                
                self.clientIndex = BigInt( intersection.blockNo );
    
                self.tip = new ChainTip( newTip );

                self.sendRollBackwards( intersection.point, tip );
                return;
            }
            else
            {
                self.clientIndex++;
                const nextClientBlock = await self.chainDb.getBlockNo( self.clientIndex );

                if( self.clientIndex === self.tip.blockNo ) self.synced = true;

                self.sendRollForward( nextClientBlock, tip );
                return;
            }
        }

        if( this.synced )
        {
            this.chainDb.on( "extend", handleExtend );
            this.chainDb.on( "fork"  , handleFork );
            this.sendAwaitReply();
            return;
        }

        // we are following the same chain (no forks)
        // and the client is not yet synced (is behind)

        this.clientIndex++;
        const nextClientBlock = await this.chainDb.getBlockNo( this.clientIndex );

        if( this.clientIndex === this.tip.blockNo ) this.synced = true;

        this.sendRollForward( nextClientBlock, tip );
        return;
    }

    sendAwaitReply(): void
    {
        this.multiplexer.send(
            new ChainSyncAwaitReply().toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }
    async sendRollBackwards( rollbackPoint: IChainPoint, tip?: IChainTip ): Promise<void>
    {
        this.synced = false;
        this.multiplexer.send(
            new ChainSyncRollBackwards({ 
                point: rollbackPoint, 
                tip: tip ?? await this.chainDb.getTip()
            }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }
    async sendRollForward( data: Uint8Array, tip?: IChainTip ): Promise<void>
    {
        this.synced = false;
        this.multiplexer.send(
            new ChainSyncRollForward({ 
                data: new CborTag(24, new CborBytes( data )),
                tip: tip ?? await this.chainDb.getTip()
            }).toCbor().toBuffer(),
            { 
                hasAgency: true, 
                protocol: MiniProtocol.ChainSync 
            }
        );
    }

    // event listeners

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
}
