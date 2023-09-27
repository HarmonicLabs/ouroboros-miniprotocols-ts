import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";
import { ChainPoint, IChainPoint } from "../types/ChainPoint";
import { BlockFetchBatchDone } from "./BlockFetchBatchDone";
import { BlockFetchClientDone } from "./BlockFetchClientDone";
import { BlockFetchMessage, blockFetchMessageFromCborObj } from "./BlockFetchMessage";
import { BlockFetchNoBlocks } from "./BlockFetchNoBlocks";
import { BlockFetchRequestRange } from "./BlockFetchRequestRange";
import { BlockFetchStartBatch } from "./BlockFetchStartBatch";
import { toHex } from "@harmoniclabs/uint8array-utils";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};


type BlockFetchClientEvtListener = ( msg: BlockFetchMessage ) => void;

type BlockFetchClientEvtListeners = {
    requestRange: BlockFetchClientEvtListener[]
    noBlocks: BlockFetchClientEvtListener[]
    startBatch: BlockFetchClientEvtListener[]
    batchDone: BlockFetchClientEvtListener[]
    clientDone: BlockFetchClientEvtListener[]
};

type BlockFetchClientEvt = keyof BlockFetchClientEvtListeners;

function msgToName( msg: BlockFetchMessage ): BlockFetchClientEvt | undefined
{
    if( msg instanceof BlockFetchRequestRange ) return "requestRange";
    if( msg instanceof BlockFetchNoBlocks ) return "noBlocks";
    if( msg instanceof BlockFetchStartBatch ) return "startBatch";
    if( msg instanceof BlockFetchBatchDone ) return "batchDone";
    if( msg instanceof BlockFetchClientDone ) return "clientDone";

    return undefined;
}

export class BlockFetchClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: () => void;

    constructor( multiplexer: Multiplexer )
    {
        const eventListeners: BlockFetchClientEvtListeners = {
            requestRange: [],
            noBlocks: [],
            startBatch: [],
            batchDone: [],
            clientDone: [],
        };

        function clearListeners(): void
        {
            eventListeners.requestRange.length  = 0;
            eventListeners.noBlocks.length      = 0;
            eventListeners.startBatch.length    = 0;
            eventListeners.batchDone.length     = 0;
            eventListeners.clientDone.length    = 0;
        }

        function hasEventListeners(): boolean
        {
            return (
                eventListeners.requestRange.length  > 0 ||
                eventListeners.noBlocks.length      > 0 ||
                eventListeners.startBatch.length    > 0 ||
                eventListeners.batchDone.length     > 0 ||
                eventListeners.clientDone.length    > 0
            );
        }

        function onRequestRange( cb: ( msg: BlockFetchRequestRange ) => void ): void
        {
            eventListeners.requestRange.push( cb );
        }
        function onNoBlocks( cb: ( msg: BlockFetchNoBlocks ) => void ): void
        {
            eventListeners.noBlocks.push( cb );
        }
        function onStartBatch( cb: ( msg: BlockFetchStartBatch ) => void ): void
        {
            eventListeners.startBatch.push( cb );
        }
        function onBatchDone( cb: ( msg: BlockFetchBatchDone ) => void ): void
        {
            eventListeners.batchDone.push( cb );
        }
        function onClientDone( cb: ( msg: BlockFetchClientDone ) => void ): void
        {
            eventListeners.clientDone.push( cb );
        }

        Object.defineProperties(
            this, {
                mplexer: {
                    value: multiplexer,
                    ...roDescr
                },
                clearListeners: {
                    value: clearListeners,
                    ...roDescr
                },
                onRequestRange: {
                    value: onRequestRange,
                    ...roDescr
                },
                onNoBlocks: {
                    value: onNoBlocks,
                    ...roDescr
                },
                onStartBatch: {
                    value: onStartBatch,
                    ...roDescr
                },
                onBatchDone: {
                    value: onBatchDone,
                    ...roDescr
                },
                onClientDone: {
                    value: onClientDone,
                    ...roDescr
                }
            }
        );

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: BlockFetchMessage[] = [];

        multiplexer.onBlockFetch( chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: BlockFetchMessage;

            if( prevBytes )
            {
                /*
                console.log( "prevBytes.length", prevBytes.length );
                console.log( "chunk.length", chunk.length );
                console.log( "prevBytes.length + chunk.length", prevBytes.length + chunk.length );

                console.log( "prevBytes", toHex( prevBytes ) );
                console.log( "chunk", toHex( chunk ) );
                // */

                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( true )
            {
                try {
                    thing = Cbor.parseWithOffset( chunk );
                }
                catch
                {
                    // assume the error is of "missing bytes";
                    prevBytes = chunk.slice();
                    break;
                }
                
                offset = thing.offset;

                // console.log( "msg byetes", offset, toHex( chunk.subarray( 0, offset ) ) );

                if( offset <= chunk.length )
                {
                    msg = blockFetchMessageFromCborObj( thing.parsed )
                    queque.unshift( msg );
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );
                    continue;
                }
                else // if( offset > chunk.length )
                {
                    prevBytes = chunk.slice();
                    break;
                }
            }

            let msgStr: BlockFetchClientEvt;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                const listeners = eventListeners[ msgStr ]; 
                for( const cb of listeners )
                {
                    void cb( msg );
                }
            }

        });
    }
    
    onRequestRange!:    ( cb: ( msg: BlockFetchRequestRange ) => void ) => void
    onNoBlocks!:        ( cb: ( msg: BlockFetchNoBlocks ) => void ) => void
    onStartBatch!:      ( cb: ( msg: BlockFetchStartBatch ) => void ) => void
    onBatchDone!:       ( cb: ( msg: BlockFetchBatchDone ) => void ) => void
    onClientDone!:      ( cb: ( msg: BlockFetchClientDone ) => void ) => void

    request( point: IChainPoint ): void
    {
        this.requestRange( point, point );
    }

    requestRange( from: IChainPoint, to: IChainPoint ): void
    {
        this.mplexer.send(
            new BlockFetchRequestRange({ from, to }).toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: MiniProtocol.BlockFetch
            }
        );
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