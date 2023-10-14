import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IChainPoint } from "../types/ChainPoint";
import { ChainSyncFindIntersect } from "./ChainSyncFindIntersect";
import { ChainSyncMessage, chainSyncMessageFromCborObj, isChainSyncMessage } from "./ChainSyncMessage";
import { ChainSyncRequestNext } from "./ChainSyncRequestNext";
import { ChainSyncRollBackwards } from "./ChainSyncRollBackwards";
import { ChainSyncRollForward } from "./ChainSyncRollForward";
import { ChainSyncIntersectFound } from "./ChainSyncIntersectFound";
import { ChainSyncIntersectNotFound } from "./ChainSyncIntersectNotFound";
import { ChainSyncAwaitReply } from "./ChainSyncAwaitReply";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { ChainSyncMessageDone } from "./ChainSyncMessageDone";
import EventEmitter from "events";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { ErrorListener } from "../../common/ErrorListener";

const roDescr = Object.freeze({
    writable: false,
    enumerable: true,
    configurable: false
});

type ChainSyncClientEvtListener = ( msg: ChainSyncMessage ) => void;
type AnyChainSyncClientEvtListener = ChainSyncClientEvtListener | (( err: Error ) => void);

type ChainSyncClientEvtListeners = {
    rollBackwards: ChainSyncClientEvtListener[]
    rollForward: ChainSyncClientEvtListener[]
    intersectFound: ChainSyncClientEvtListener[]
    intersectNotFound: ChainSyncClientEvtListener[]
    awaitReply: ChainSyncClientEvtListener[],
    error: (( err: Error ) => void)[]
};

type ChainSyncClientEvtName = keyof Omit<ChainSyncClientEvtListeners,"error">;
type AnyChainSyncClientEvtName = ChainSyncClientEvtName | "error";

type EvtListenerOf<EvtName extends AnyChainSyncClientEvtName> =
    EvtName extends "rollBackwards"     ? ( msg: ChainSyncRollBackwards ) => void :
    EvtName extends "rollForward"       ? ( msg: ChainSyncRollForward ) => void :
    EvtName extends "intersectFound"    ? ( msg: ChainSyncIntersectFound) => void :
    EvtName extends "intersectNotFound" ? ( msg: ChainSyncIntersectNotFound ) => void :
    EvtName extends "awaitReply"        ? ( msg: ChainSyncAwaitReply ) => void :
    EvtName extends "error"             ? ( err: Error ) => void :
    never;

type MsgOf<EvtName extends AnyChainSyncClientEvtName> =
    EvtName extends "rollBackwards"     ? ChainSyncRollBackwards :
    EvtName extends "rollForward"       ? ChainSyncRollForward :
    EvtName extends "intersectFound"    ? ChainSyncIntersectFound :
    EvtName extends "intersectNotFound" ? ChainSyncIntersectNotFound :
    EvtName extends "awaitReply"        ? ChainSyncAwaitReply :
    EvtName extends "error"             ? Error :
    never;

function isChainSyncClientEvtName( str: any ): str is ChainSyncClientEvtName
{
    return (
        str === "rollBackwards" ||
        str === "rollForward" ||
        str === "intersectFound" ||
        str === "intersectNotFound" ||
        str === "awaitReply"
    );
}

function isAnyChainSyncClientEvtName( str: any ): str is AnyChainSyncClientEvtName
{
    return isChainSyncClientEvtName( str ) || str === "error";
}

function msgToName( msg: ChainSyncMessage ): ChainSyncClientEvtName | undefined
{
    if( msg instanceof ChainSyncRollBackwards ) return "rollBackwards";
    if( msg instanceof ChainSyncRollForward ) return "rollForward";
    if( msg instanceof ChainSyncIntersectFound ) return "intersectFound";
    if( msg instanceof ChainSyncIntersectNotFound ) return "intersectNotFound";
    if( msg instanceof ChainSyncAwaitReply ) return "awaitReply";

    return undefined;
}

export interface IChainSyncClient {
    readonly mplexer: Multiplexer,

    addEventListener( eventName: "rollBackwards"        , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( eventName: "rollForward"          , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( eventName: "intersectFound"       , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( eventName: "intersectNotFound"    , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( eventName: "awaitReply"           , listener: ChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( eventName: "error"                , listener: (err: Error) => void ): this
    addEventListener( eventName: AnyChainSyncClientEvtName , listener: AnyChainSyncClientEvtListener, options?: AddEvtListenerOpts ): this

    addListener( eventName: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    addListener( eventName: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    addListener( eventName: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    addListener( eventName: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    addListener( eventName: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    addListener( eventName: "error"                , listener: (err: Error) => void): this
    addListener( eventName: AnyChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    on( eventName: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    on( eventName: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    on( eventName: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    on( eventName: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    on( eventName: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    on( eventName: "error"                , listener: (err: Error) => void ): this
    on( eventName: ChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    once( eventName: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    once( eventName: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    once( eventName: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    once( eventName: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    once( eventName: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    once( eventName: "error"                , listener: (err: Error) => void ): this
    once( eventName: ChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    removeEventListener( eventName: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    removeEventListener( eventName: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    removeEventListener( eventName: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    removeEventListener( eventName: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    removeEventListener( eventName: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    removeEventListener( eventName: "error"                , listener: (err: Error) => void ): this
    removeEventListener( eventName: ChainSyncClientEvtName | "error", listener: ChainSyncClientEvtListener ): this

    removeListener( eventName: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    removeListener( eventName: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    removeListener( eventName: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    removeListener( eventName: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    removeListener( eventName: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    removeListener( eventName: "error"                , listener: (err: Error) => void ): this
    removeListener( eventName: ChainSyncClientEvtName | "error" , listener: ChainSyncClientEvtListener ): this

    off( eventName: "rollBackwards"        , listener: ChainSyncClientEvtListener ): this
    off( eventName: "rollForward"          , listener: ChainSyncClientEvtListener ): this
    off( eventName: "intersectFound"       , listener: ChainSyncClientEvtListener ): this
    off( eventName: "intersectNotFound"    , listener: ChainSyncClientEvtListener ): this
    off( eventName: "awaitReply"           , listener: ChainSyncClientEvtListener ): this
    off( eventName: "error"                , listener: ErrorListener ): this
    off( eventName: ChainSyncClientEvtName , listener: ChainSyncClientEvtListener ): this

    removeAllListeners( event?: ChainSyncClientEvtName | "error" ): this

    emit( eventName: "rollBackwards"        , msg: ChainSyncRollBackwards ): boolean
    emit( eventName: "rollForward"          , msg: ChainSyncRollForward ): boolean
    emit( eventName: "intersectFound"       , msg: ChainSyncIntersectFound ): boolean
    emit( eventName: "intersectNotFound"    , msg: ChainSyncIntersectNotFound ): boolean
    emit( eventName: "awaitReply"           , msg: ChainSyncAwaitReply ): boolean
    emit( eventName: "error"                , err: Error ): boolean
    emit( eventName: ChainSyncClientEvtName | "error" , msg: ChainSyncMessage | Error ): boolean
    
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
     * 
     * @returns {true} `false` if event is cancelable, and at least one of the event handlers which received event called Event.preventDefault(). Otherwise `true`.
     */
    dispatchEvent( eventName: "rollBackwards"        , msg: ChainSyncRollBackwards ): boolean
    dispatchEvent( eventName: "rollForward"          , msg: ChainSyncRollForward ): boolean
    dispatchEvent( eventName: "intersectFound"       , msg: ChainSyncIntersectFound ): boolean
    dispatchEvent( eventName: "intersectNotFound"    , msg: ChainSyncIntersectNotFound ): boolean
    dispatchEvent( eventName: "awaitReply"           , msg: ChainSyncAwaitReply ): boolean
    dispatchEvent( eventName: "error"                , err: Error ): boolean
    dispatchEvent( eventName: ChainSyncClientEvtName , msg: ChainSyncMessage ): boolean
}

export class ChainSyncClient
    implements IChainSyncClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: ( event   ?: ChainSyncClientEvtName ) => this;

    addEventListener:    <EvtName extends AnyChainSyncClientEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends AnyChainSyncClientEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends AnyChainSyncClientEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends AnyChainSyncClientEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends AnyChainSyncClientEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends AnyChainSyncClientEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends AnyChainSyncClientEvtName>( eventName: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: ChainSyncClientEvtName ) => this
    emit:                <EvtName extends ChainSyncClientEvtName>( eventName: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends ChainSyncClientEvtName>( eventName: EvtName, msg: MsgOf<EvtName> ) => boolean
    

    /** @deprecated */
    onRollBackwards: ( cb: ( msg: ChainSyncRollBackwards ) => void ) => void
    /** @deprecated */
    onRollForward: ( cb: ( msg: ChainSyncRollForward ) => void ) => void
    /** @deprecated */
    onIntersectFound: ( cb: ( msg: ChainSyncIntersectFound ) => void ) => void
    /** @deprecated */
    onIntersectNotFound: ( cb: ( msg: ChainSyncIntersectNotFound ) => void ) => void
    /** @deprecated */
    onAwaitReply: ( cb: ( msg: ChainSyncAwaitReply ) => void ) => void

    constructor( multiplexer: Multiplexer )
    {
        const self = this;

        const eventListeners: ChainSyncClientEvtListeners = {
            rollBackwards: [],
            rollForward: [],
            intersectFound: [],
            intersectNotFound: [],
            awaitReply: [],
            error: []
        };

        const onceEventListeners: ChainSyncClientEvtListeners = {
            rollBackwards: [],
            rollForward: [],
            intersectFound: [],
            intersectNotFound: [],
            awaitReply: [],
            error: []
        };

        function clearListeners( eventName?: ChainSyncClientEvtName ): typeof self
        {
            if( isAnyChainSyncClientEvtName( eventName ) )
            {
                eventListeners[eventName].length = 0;
                onceEventListeners[eventName].length = 0;
                return self;
            }
            eventListeners.rollBackwards.length     = 0;
            eventListeners.rollForward.length       = 0;
            eventListeners.intersectFound.length    = 0;
            eventListeners.intersectNotFound.length = 0;
            eventListeners.awaitReply.length        = 0;

            onceEventListeners.rollBackwards.length     = 0;
            onceEventListeners.rollForward.length       = 0;
            onceEventListeners.intersectFound.length    = 0;
            onceEventListeners.intersectNotFound.length = 0;
            onceEventListeners.awaitReply.length        = 0;

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
                eventListeners.rollBackwards.length     > 0 ||
                eventListeners.rollForward.length       > 0 ||
                eventListeners.intersectFound.length    > 0 ||
                eventListeners.intersectNotFound.length > 0 ||
                eventListeners.awaitReply.length        > 0 ||

                onceEventListeners.rollBackwards.length     > 0 ||
                onceEventListeners.rollForward.length       > 0 ||
                onceEventListeners.intersectFound.length    > 0 ||
                onceEventListeners.intersectNotFound.length > 0 ||
                onceEventListeners.awaitReply.length        > 0
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

        function addEventListenerOnce( eventName: AnyChainSyncClientEvtName, listener: AnyChainSyncClientEvtListener ): typeof self
        {
            if( !isAnyChainSyncClientEvtName( eventName ) ) return self;

            onceEventListeners[ eventName ].push( listener as any );
            return self;
        }
        function addEventListener( eventName: AnyChainSyncClientEvtName, listener: ChainSyncClientEvtListener, opts?: AddEvtListenerOpts ): typeof self
        {
            if( opts?.once === true ) return addEventListenerOnce( eventName, listener );
            
            if( !isAnyChainSyncClientEvtName( eventName ) ) return self;
            
            eventListeners[ eventName ].push( listener as any );
            return self;
        }
        function removeEventListener( eventName: AnyChainSyncClientEvtName, listener: ChainSyncClientEvtListener ): typeof self
        {
            if( !isAnyChainSyncClientEvtName( eventName ) ) return self;

            eventListeners[eventName] = eventListeners[eventName].filter( fn => fn !== listener ) as any;
            onceEventListeners[eventName] = onceEventListeners[eventName].filter( fn => fn !== listener ) as any;
            return self; 
        }

        function dispatchEvent( eventName: AnyChainSyncClientEvtName, msg: ChainSyncMessage | Error ): boolean
        {
            // console.log( eventName, msg );
            if( !isAnyChainSyncClientEvtName( eventName ) ) return true;
            if( eventName !== "error" && !isChainSyncMessage( msg ) ) return true;

            const listeners = eventListeners[ eventName ];
            const nListeners = listeners.length;
            for(let i = 0; i < nListeners; i++)
            {
                listeners[i](msg as any);
            }

            const onceListeners = onceEventListeners[eventName];
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
                onRollBackwards:        { value: onRollBackwards, ...roDescr },
                onRollForward:          { value: onRollForward, ...roDescr },
                onIntersectFound:       { value: onIntersectFound, ...roDescr },
                onIntersectNotFound:    { value: onIntersectNotFound, ...roDescr },
                onAwaitReply:           { value: onAwaitReply, ...roDescr },
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
        const queque: ChainSyncMessage[] = [];

        multiplexer.on( MiniProtocol.ChainSync, chunk => {

            if( !hasEventListeners() ) return;

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
                try {
                    thing = Cbor.parseWithOffset( chunk );
                }
                catch
                {
                    // assume the error is of "missing bytes";
                    prevBytes = Uint8Array.prototype.slice.call( chunk );
                    break;
                }
                
                offset = thing.offset;

                // console.log( "msg byetes", offset, toHex( chunk.subarray( 0, offset ) ) );
                try {
                    msg = chainSyncMessageFromCborObj( thing.parsed );
                    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
                    msg.cborBytes = Uint8Array.prototype.slice.call( chunk, 0, offset );
                    
                    queque.unshift( msg );
                }
                catch (e)
                {
                    const err = typeof e?.message === "string" ? 
                        new Error(
                            e.message +
                            "\ndata: " + toHex( chunk ) + "\n"
                        ):
                        new Error(
                            "\ndata: " + toHex( chunk ) + "\n"
                        )
                    dispatchEvent("error", err );
                }

                if( offset < chunk.length )
                {
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );
                }
            }

            let msgStr: ChainSyncClientEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }
        });
    }

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