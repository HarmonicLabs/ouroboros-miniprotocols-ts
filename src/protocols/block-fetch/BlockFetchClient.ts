import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";
import { ChainPoint, IChainPoint, isOriginPoint } from "../types/ChainPoint";
import { BlockFetchBatchDone } from "./messages/BlockFetchBatchDone";
import { BlockFetchClientDone } from "./messages/BlockFetchClientDone";
import { BlockFetchMessage, blockFetchMessageFromCborObj, isBlockFetchMessage } from "./BlockFetchMessage";
import { BlockFetchNoBlocks } from "./messages/BlockFetchNoBlocks";
import { BlockFetchRequestRange } from "./messages/BlockFetchRequestRange";
import { BlockFetchStartBatch } from "./messages/BlockFetchStartBatch";
import { BlockFetchBlock } from "./messages/BlockFetchBlock";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { toHex } from "@harmoniclabs/uint8array-utils";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

type AnyBlockFetchClientEvtNameListener = ( msg: BlockFetchMessage ) => void;

type BlockFetchClientEvtNameListeners = {
    requestRange: AnyBlockFetchClientEvtNameListener[]
    noBlocks: AnyBlockFetchClientEvtNameListener[]
    startBatch: AnyBlockFetchClientEvtNameListener[]
    batchDone: AnyBlockFetchClientEvtNameListener[]
    clientDone: AnyBlockFetchClientEvtNameListener[]
    block: AnyBlockFetchClientEvtNameListener[],
    error: (( err: Error ) => void)[]
};

type BlockFetchClientEvtName = keyof BlockFetchClientEvtNameListeners;

function isAnyBlockFetchClientEvtName( evt: any ): evt is BlockFetchClientEvtName
{
    return typeof evt === "string" && (
        evt === "requestRange" ||
        evt === "noBlocks" ||
        evt === "startBatch" ||
        evt === "batchDone" ||
        evt === "clientDone" ||
        evt === "block" ||
        evt === "error"
    );
}

function msgToName( msg: BlockFetchMessage | Error ): BlockFetchClientEvtName | undefined
{
    if( msg instanceof BlockFetchRequestRange ) return "requestRange";
    if( msg instanceof BlockFetchNoBlocks ) return "noBlocks";
    if( msg instanceof BlockFetchBlock ) return "block";
    if( msg instanceof BlockFetchStartBatch ) return "startBatch";
    if( msg instanceof BlockFetchBatchDone ) return "batchDone";
    if( msg instanceof BlockFetchClientDone ) return "clientDone";
    if( msg instanceof Error ) return "error";

    return undefined;
}

type MsgOf<Evt extends BlockFetchClientEvtName> =
    Evt extends "requestRange" ? BlockFetchRequestRange :
    Evt extends "noBlocks" ? BlockFetchNoBlocks :
    Evt extends "startBatch" ? BlockFetchStartBatch :
    Evt extends "batchDone" ? BlockFetchBatchDone :
    Evt extends "clientDone" ? BlockFetchClientDone :
    Evt extends "block" ? BlockFetchBlock :
    Evt extends "error" ? Error :
    never;

type EvtListenerOf<Evt extends BlockFetchClientEvtName> = ( msg: MsgOf<Evt> ) => void

export class BlockFetchClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: () => void;

    addEventListener:    <EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends BlockFetchClientEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: BlockFetchClientEvtName ) => this
    emit:                <EvtName extends BlockFetchClientEvtName>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends BlockFetchClientEvtName>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    
    constructor( multiplexer: Multiplexer )
    {
        const self =  this;

        const eventListeners: BlockFetchClientEvtNameListeners = {
            requestRange: [],
            noBlocks: [],
            startBatch: [],
            batchDone: [],
            clientDone: [],
            block: [],
            error: []
        };
        const onceEventListeners: BlockFetchClientEvtNameListeners = {
            requestRange: [],
            noBlocks: [],
            startBatch: [],
            batchDone: [],
            clientDone: [],
            block: [],
            error: []
        };

        function clearListeners( evt?: BlockFetchClientEvtName ): typeof self
        {
            if( isAnyBlockFetchClientEvtName( evt ) )
            {
                eventListeners[evt].length = 0;
                onceEventListeners[evt].length = 0;
                return self;
            }
            eventListeners.requestRange.length      = 0;
            eventListeners.noBlocks.length          = 0;
            eventListeners.startBatch.length        = 0;
            eventListeners.batchDone.length         = 0;
            eventListeners.clientDone.length        = 0;
            eventListeners.block.length             = 0;
            eventListeners.error.length             = 0;

            onceEventListeners.requestRange.length      = 0;
            onceEventListeners.noBlocks.length          = 0;
            onceEventListeners.startBatch.length        = 0;
            onceEventListeners.batchDone.length         = 0;
            onceEventListeners.clientDone.length        = 0;
            onceEventListeners.block.length             = 0;
            onceEventListeners.error.length             = 0;

            return self;
        }

        function hasEventListeners( includeError: boolean = false ): boolean
        {
            return  (
                includeError ? (
                    eventListeners.error.length             > 0 ||
                    onceEventListeners.error.length         > 0
                ) : true
            ) && (
                eventListeners.requestRange.length     > 0 ||
                eventListeners.noBlocks.length       > 0 ||
                eventListeners.startBatch.length    > 0 ||
                eventListeners.batchDone.length > 0 ||
                eventListeners.clientDone.length        > 0 ||
                eventListeners.block.length        > 0 ||

                onceEventListeners.requestRange.length     > 0 ||
                onceEventListeners.noBlocks.length       > 0 ||
                onceEventListeners.startBatch.length    > 0 ||
                onceEventListeners.batchDone.length > 0 ||
                onceEventListeners.clientDone.length > 0 ||
                onceEventListeners.block.length        > 0
            );
        }

        /** @deprecated */
        function onRequestRange( cb: ( msg: BlockFetchRequestRange ) => void ): void
        {
            eventListeners.requestRange.push( cb );
        }
        /** @deprecated */
        function onNoBlocks( cb: ( msg: BlockFetchNoBlocks ) => void ): void
        {
            eventListeners.noBlocks.push( cb );
        }
        /** @deprecated */
        function onBlock( cb: ( msg: BlockFetchBlock ) => void ): void
        {
            eventListeners.block.push( cb );
        }
        /** @deprecated */
        function onStartBatch( cb: ( msg: BlockFetchStartBatch ) => void ): void
        {
            eventListeners.startBatch.push( cb );
        }
        /** @deprecated */
        function onBatchDone( cb: ( msg: BlockFetchBatchDone ) => void ): void
        {
            eventListeners.batchDone.push( cb );
        }
        /** @deprecated */
        function onClientDone( cb: ( msg: BlockFetchClientDone ) => void ): void
        {
            eventListeners.clientDone.push( cb );
        }

        function addEventListenerOnce( evt: BlockFetchClientEvtName, listener: AnyBlockFetchClientEvtNameListener ): typeof self
        {
            if( !isAnyBlockFetchClientEvtName( evt ) ) return self;

            onceEventListeners[ evt ].push( listener as any );
            return self;
        }
        function addEventListener( evt: BlockFetchClientEvtName, listener: AnyBlockFetchClientEvtNameListener, opts?: AddEvtListenerOpts ): typeof self
        {
            if( opts?.once === true ) return addEventListenerOnce( evt, listener );
            
            if( !isAnyBlockFetchClientEvtName( evt ) ) return self;
            
            eventListeners[ evt ].push( listener as any );
            return self;
        }
        function removeEventListener( evt: BlockFetchClientEvtName, listener: AnyBlockFetchClientEvtNameListener ): typeof self
        {
            if( !isAnyBlockFetchClientEvtName( evt ) ) return self;

            eventListeners[evt] = eventListeners[evt].filter( fn => fn !== listener ) as any;
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener ) as any;
            return self; 
        }
        function dispatchEvent( evt: BlockFetchClientEvtName, msg: BlockFetchMessage | Error ): boolean
        {
            if( !isAnyBlockFetchClientEvtName( evt ) ) return true;
            if( evt !== "error" && !isBlockFetchMessage( msg ) ) return true;

            const listeners = eventListeners[ evt ];
            const nListeners = listeners.length;
            for(let i = 0; i < nListeners; i++)
            {
                listeners[i](msg as any);
            }

            const onceListeners = onceEventListeners[evt];

            if( evt === "error" && nListeners + onceListeners.length === 0 )
            {
                throw msg instanceof Error ? msg : new Error( "Unhandled error: " + msg );
            }

            while( onceListeners.length > 0 )
            {
                onceListeners.shift()!(msg as any);
            }

            return true;
        }

        Object.defineProperties(
            this, {
                mplexer:                { value: multiplexer, ...roDescr },
                clearListeners:         { value: clearListeners, ...roDescr },
                removeAllListeners:     { value: clearListeners, ...roDescr },
                onRequestRange:         { value: onRequestRange, ...roDescr },
                onNoBlocks:             { value: onNoBlocks, ...roDescr },
                onBlock:                { value: onBlock, ...roDescr },
                onStartBatch:           { value: onStartBatch, ...roDescr },
                onBatchDone:            { value: onBatchDone, ...roDescr },
                onClientDone:           { value: onClientDone, ...roDescr },
                addEventListener:       { value: addEventListener, ...roDescr },
                addListener:            { value: addEventListener, ...roDescr },
                on:                     { value: addEventListener, ...roDescr },
                once:                   { value: addEventListenerOnce, ...roDescr },
                removeEventListener:    { value: removeEventListener, ...roDescr },
                removeListener:         { value: removeEventListener, ...roDescr },
                off:                    { value: removeEventListener, ...roDescr },
                dispatchEvent:          { value: dispatchEvent, ...roDescr },
                emit:                   { value: dispatchEvent, ...roDescr },
            }
        );

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: BlockFetchMessage[] = [];

        multiplexer.on( MiniProtocol.BlockFetch ,chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: BlockFetchMessage;

            // const dbg_chunk = Uint8Array.prototype.slice.call( chunk );
            // const dbg_prev = prevBytes ? Uint8Array.prototype.slice.call( prevBytes ) : prevBytes;

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
                catch (e)
                {
                    // before dispatch event
                    Error.stackTraceLimit = originalSTLimit;

                    // console.error("-------------------------------------------------------");
                    // console.error( "dbg_chunk", toHex( dbg_chunk ) );
                    // console.error( "dbg_prev", dbg_prev ? toHex( dbg_prev ) : dbg_prev );
                    // console.error("-------------------------------------------------------");
                    const err = new Error(
                        (typeof e?.message === "string" ? e.message : "") +
                        "\ndata: " + toHex( chunk ) + "\n"
                    );
                    
                    dispatchEvent("error", err );
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

            let msgStr: BlockFetchClientEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }

        });
    }

    /** @deprecated */
    onRequestRange!:    ( cb: ( msg: BlockFetchRequestRange ) => void ) => void
    /** @deprecated */
    onNoBlocks!:        ( cb: ( msg: BlockFetchNoBlocks     ) => void ) => void
    /** @deprecated */
    onBlock!:           ( cb: ( msg: BlockFetchBlock        ) => void ) => void
    /** @deprecated */
    onStartBatch!:      ( cb: ( msg: BlockFetchStartBatch   ) => void ) => void
    /** @deprecated */
    onBatchDone!:       ( cb: ( msg: BlockFetchBatchDone    ) => void ) => void
    /** @deprecated */
    onClientDone!:      ( cb: ( msg: BlockFetchClientDone   ) => void ) => void

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
            this.dispatchEvent(
                "error",
                new Error(
                    "trying to request origin point; " +
                    "The Genesis Block exsists as a concept, but not really in a node database; " +
                    "BlockFetchClient::requestRange will resolve with `BlockFetchNoBlocks`; " +
                    "try with the first real block point"
                )
            );
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