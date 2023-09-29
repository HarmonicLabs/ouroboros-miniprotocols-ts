import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IChainPoint } from "../types/ChainPoint";
import { ChainSyncFindIntersect } from "./ChainSyncFindIntersect";
import { ChainSyncMessage, chainSyncMessageFromCborObj } from "./ChainSyncMessage";
import { ChainSyncRequestNext } from "./ChainSyncRequestNext";
import { ChainSyncRollBackwards } from "./ChainSyncRollBackwards";
import { ChainSyncRollForward } from "./ChainSyncRollForward";
import { ChainSyncIntersectFound } from "./ChainSyncIntersectFound";
import { ChainSyncIntersectNotFound } from "./ChainSyncIntersectNotFound";
import { ChainSyncAwaitReply } from "./ChainSyncAwaitReply";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { ChainSyncMessageDone } from "./ChainSyncMessageDone";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

type ChainSyncClientEvtListener = ( msg: ChainSyncMessage ) => void;

type ChainSyncClientEvtListeners = {
    rollBackwards: ChainSyncClientEvtListener[]
    rollForward: ChainSyncClientEvtListener[]
    intersectFound: ChainSyncClientEvtListener[]
    intersectNotFound: ChainSyncClientEvtListener[]
    awaitReply: ChainSyncClientEvtListener[]
};

type ChainSyncClientEvt = keyof ChainSyncClientEvtListeners;

function msgToName( msg: ChainSyncMessage ): ChainSyncClientEvt | undefined
{
    if( msg instanceof ChainSyncRollBackwards ) return "rollBackwards";
    if( msg instanceof ChainSyncRollForward ) return "rollBackwards";
    if( msg instanceof ChainSyncIntersectFound ) return "intersectFound";
    if( msg instanceof ChainSyncIntersectNotFound ) return "intersectNotFound";
    if( msg instanceof ChainSyncAwaitReply ) return "awaitReply";

    return undefined;
}

export class ChainSyncClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: () => void;

    constructor( multiplexer: Multiplexer )
    {
        const eventListeners: ChainSyncClientEvtListeners = {
            rollBackwards: [],
            rollForward: [],
            intersectFound: [],
            intersectNotFound: [],
            awaitReply: [],
        };

        function clearListeners(): void
        {
            eventListeners.rollBackwards.length     = 0;
            eventListeners.rollForward.length       = 0;
            eventListeners.intersectFound.length    = 0;
            eventListeners.intersectNotFound.length = 0;
            eventListeners.awaitReply.length        = 0;
        }

        function hasEventListeners(): boolean
        {
            return (
                eventListeners.rollBackwards.length     > 0 ||
                eventListeners.rollForward.length       > 0 ||
                eventListeners.intersectFound.length    > 0 ||
                eventListeners.intersectNotFound.length > 0 ||
                eventListeners.awaitReply.length        > 0
            );
        }

        function onRollBackwards( cb: ( msg: ChainSyncRollBackwards ) => void ): void
        {
            eventListeners.rollBackwards.push( cb );
        }
        function onRollForward( cb: ( msg: ChainSyncRollForward ) => void ): void
        {
            eventListeners.rollForward.push( cb );
        }
        function onIntersectFound( cb: ( msg: ChainSyncIntersectFound ) => void ): void
        {
            eventListeners.intersectFound.push( cb );
        }
        function onIntersectNotFound( cb: ( msg: ChainSyncIntersectNotFound ) => void ): void
        {
            eventListeners.intersectNotFound.push( cb );
        }
        function onAwaitReply( cb: ( msg: ChainSyncAwaitReply ) => void ): void
        {
            eventListeners.awaitReply.push( cb );
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
                onRollBackwards: {
                    value: onRollBackwards,
                    ...roDescr
                },
                onRollForward: {
                    value: onRollForward,
                    ...roDescr
                },
                onIntersectFound: {
                    value: onIntersectFound,
                    ...roDescr
                },
                onIntersectNotFound: {
                    value: onIntersectNotFound,
                    ...roDescr
                },
                onAwaitReply: {
                    value: onAwaitReply,
                    ...roDescr
                },
            }
        );

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: ChainSyncMessage[] = [];

        multiplexer.onChainSync( chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: ChainSyncMessage;

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
                msg = chainSyncMessageFromCborObj( thing.parsed )
                queque.unshift( msg );

                if( offset < chunk.length )
                {
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );
                    continue;
                }
                else // if( offset > chunk.length )
                {
                    prevBytes = offset === chunk.length ? 
                        undefined : 
                        Uint8Array.prototype.slice.call( chunk );
                    break;
                }
            }

            let msgStr: ChainSyncClientEvt;
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

    onRollBackwards: ( cb: ( msg: ChainSyncRollBackwards ) => void ) => void
    onRollForward: ( cb: ( msg: ChainSyncRollForward ) => void ) => void
    onIntersectFound: ( cb: ( msg: ChainSyncIntersectFound ) => void ) => void
    onIntersectNotFound: ( cb: ( msg: ChainSyncIntersectNotFound ) => void ) => void
    onAwaitReply: ( cb: ( msg: ChainSyncAwaitReply ) => void ) => void

    requestNext(): void
    {
        this.mplexer.send(
            new ChainSyncRequestNext().toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: this.mplexer.isN2N ? 
                    MiniProtocol.ChainSync :
                    MiniProtocol.LocalChainSync
            }
        );
    }

    findIntersect( points: IChainPoint[] ): void
    {
        this.mplexer.send(
            new ChainSyncFindIntersect({ points }).toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: this.mplexer.isN2N ? 
                    MiniProtocol.ChainSync :
                    MiniProtocol.LocalChainSync
            }
        );
    }

    done(): void
    {
        this.mplexer.send(
            new ChainSyncMessageDone().toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: this.mplexer.isN2N ? 
                    MiniProtocol.ChainSync :
                    MiniProtocol.LocalChainSync
            }
        );
        this.clearListeners();
    }
}