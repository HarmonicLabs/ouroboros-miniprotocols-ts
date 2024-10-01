import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IChainPoint } from "../types/ChainPoint";
import { ChainSyncMessage, chainSyncMessageFromCborObj, isChainSyncMessage } from "./ChainSyncMessage";
import { toHex } from "@harmoniclabs/uint8array-utils";
 import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { ErrorListener } from "../../common/ErrorListener";
import { ChainSyncRollBackwards, ChainSyncRollForward, ChainSyncIntersectFound, ChainSyncIntersectNotFound, ChainSyncAwaitReply, ChainSyncRequestNext, ChainSyncFindIntersect, ChainSyncMessageDone } from "./messages";

const roDescr = Object.freeze({
    writable: false,
    enumerable: true,
    configurable: false
});

type ChainSyncServerEvtListener = ( msg: ChainSyncMessage ) => void;
type AnyChainSyncServerEvtListener = ChainSyncServerEvtListener | (( err: Error ) => void);

type ChainSyncServerEvtListeners = {
    rollBackwards: ChainSyncServerEvtListener[]
    rollForward: ChainSyncServerEvtListener[]
    intersectFound: ChainSyncServerEvtListener[]
    intersectNotFound: ChainSyncServerEvtListener[]
    awaitReply: ChainSyncServerEvtListener[],
    error: (( err: Error ) => void)[]
};

type ChainSyncServerEvtName = keyof Omit<ChainSyncServerEvtListeners,"error">;
type AnyChainSyncServerEvtName = ChainSyncServerEvtName | "error";

type EvtListenerOf<EvtName extends AnyChainSyncServerEvtName> =
    EvtName extends "rollBackwards"     ? ( msg: ChainSyncRollBackwards ) => void :
    EvtName extends "rollForward"       ? ( msg: ChainSyncRollForward ) => void :
    EvtName extends "intersectFound"    ? ( msg: ChainSyncIntersectFound) => void :
    EvtName extends "intersectNotFound" ? ( msg: ChainSyncIntersectNotFound ) => void :
    EvtName extends "awaitReply"        ? ( msg: ChainSyncAwaitReply ) => void :
    EvtName extends "error"             ? ( err: Error ) => void :
    never;

type MsgOf<EvtName extends AnyChainSyncServerEvtName> =
    EvtName extends "rollBackwards"     ? ChainSyncRollBackwards :
    EvtName extends "rollForward"       ? ChainSyncRollForward :
    EvtName extends "intersectFound"    ? ChainSyncIntersectFound :
    EvtName extends "intersectNotFound" ? ChainSyncIntersectNotFound :
    EvtName extends "awaitReply"        ? ChainSyncAwaitReply :
    EvtName extends "error"             ? Error :
    never;

function isChainSyncServerEvtName( str: any ): str is ChainSyncServerEvtName
{
    return (
        str === "rollBackwards" ||
        str === "rollForward" ||
        str === "intersectFound" ||
        str === "intersectNotFound" ||
        str === "awaitReply"
    );
}

function isAnyChainSyncServerEvtName( str: any ): str is AnyChainSyncServerEvtName
{
    return isChainSyncServerEvtName( str ) || str === "error";
}

function msgToName( msg: ChainSyncMessage ): ChainSyncServerEvtName | undefined
{
    if( msg instanceof ChainSyncRollBackwards ) return "rollBackwards";
    if( msg instanceof ChainSyncRollForward ) return "rollForward";
    if( msg instanceof ChainSyncIntersectFound ) return "intersectFound";
    if( msg instanceof ChainSyncIntersectNotFound ) return "intersectNotFound";
    if( msg instanceof ChainSyncAwaitReply ) return "awaitReply";

    return undefined;
}

export interface IChainSyncServer {
    readonly mplexer: Multiplexer,

    addEventListener( evt: "rollBackwards"        , listener: ChainSyncServerEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "rollForward"          , listener: ChainSyncServerEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "intersectFound"       , listener: ChainSyncServerEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "intersectNotFound"    , listener: ChainSyncServerEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "awaitReply"           , listener: ChainSyncServerEvtListener, options?: AddEvtListenerOpts ): this
    addEventListener( evt: "error"                , listener: (err: Error) => void ): this
    addEventListener( evt: AnyChainSyncServerEvtName , listener: AnyChainSyncServerEvtListener, options?: AddEvtListenerOpts ): this

    addListener( evt: "rollBackwards"        , listener: ChainSyncServerEvtListener ): this
    addListener( evt: "rollForward"          , listener: ChainSyncServerEvtListener ): this
    addListener( evt: "intersectFound"       , listener: ChainSyncServerEvtListener ): this
    addListener( evt: "intersectNotFound"    , listener: ChainSyncServerEvtListener ): this
    addListener( evt: "awaitReply"           , listener: ChainSyncServerEvtListener ): this
    addListener( evt: "error"                , listener: (err: Error) => void): this
    addListener( evt: AnyChainSyncServerEvtName , listener: ChainSyncServerEvtListener ): this

    on( evt: "rollBackwards"        , listener: ChainSyncServerEvtListener ): this
    on( evt: "rollForward"          , listener: ChainSyncServerEvtListener ): this
    on( evt: "intersectFound"       , listener: ChainSyncServerEvtListener ): this
    on( evt: "intersectNotFound"    , listener: ChainSyncServerEvtListener ): this
    on( evt: "awaitReply"           , listener: ChainSyncServerEvtListener ): this
    on( evt: "error"                , listener: (err: Error) => void ): this
    on( evt: ChainSyncServerEvtName , listener: ChainSyncServerEvtListener ): this

    once( evt: "rollBackwards"        , listener: ChainSyncServerEvtListener ): this
    once( evt: "rollForward"          , listener: ChainSyncServerEvtListener ): this
    once( evt: "intersectFound"       , listener: ChainSyncServerEvtListener ): this
    once( evt: "intersectNotFound"    , listener: ChainSyncServerEvtListener ): this
    once( evt: "awaitReply"           , listener: ChainSyncServerEvtListener ): this
    once( evt: "error"                , listener: (err: Error) => void ): this
    once( evt: ChainSyncServerEvtName , listener: ChainSyncServerEvtListener ): this

    removeEventListener( evt: "rollBackwards"        , listener: ChainSyncServerEvtListener ): this
    removeEventListener( evt: "rollForward"          , listener: ChainSyncServerEvtListener ): this
    removeEventListener( evt: "intersectFound"       , listener: ChainSyncServerEvtListener ): this
    removeEventListener( evt: "intersectNotFound"    , listener: ChainSyncServerEvtListener ): this
    removeEventListener( evt: "awaitReply"           , listener: ChainSyncServerEvtListener ): this
    removeEventListener( evt: "error"                , listener: (err: Error) => void ): this
    removeEventListener( evt: ChainSyncServerEvtName | "error", listener: ChainSyncServerEvtListener ): this

    removeListener( evt: "rollBackwards"        , listener: ChainSyncServerEvtListener ): this
    removeListener( evt: "rollForward"          , listener: ChainSyncServerEvtListener ): this
    removeListener( evt: "intersectFound"       , listener: ChainSyncServerEvtListener ): this
    removeListener( evt: "intersectNotFound"    , listener: ChainSyncServerEvtListener ): this
    removeListener( evt: "awaitReply"           , listener: ChainSyncServerEvtListener ): this
    removeListener( evt: "error"                , listener: (err: Error) => void ): this
    removeListener( evt: ChainSyncServerEvtName | "error" , listener: ChainSyncServerEvtListener ): this

    off( evt: "rollBackwards"        , listener: ChainSyncServerEvtListener ): this
    off( evt: "rollForward"          , listener: ChainSyncServerEvtListener ): this
    off( evt: "intersectFound"       , listener: ChainSyncServerEvtListener ): this
    off( evt: "intersectNotFound"    , listener: ChainSyncServerEvtListener ): this
    off( evt: "awaitReply"           , listener: ChainSyncServerEvtListener ): this
    off( evt: "error"                , listener: ErrorListener ): this
    off( evt: ChainSyncServerEvtName , listener: ChainSyncServerEvtListener ): this

    removeAllListeners( event?: ChainSyncServerEvtName | "error" ): this

    emit( evt: "rollBackwards"        , msg: ChainSyncRollBackwards ): boolean
    emit( evt: "rollForward"          , msg: ChainSyncRollForward ): boolean
    emit( evt: "intersectFound"       , msg: ChainSyncIntersectFound ): boolean
    emit( evt: "intersectNotFound"    , msg: ChainSyncIntersectNotFound ): boolean
    emit( evt: "awaitReply"           , msg: ChainSyncAwaitReply ): boolean
    emit( evt: "error"                , err: Error ): boolean
    emit( evt: ChainSyncServerEvtName | "error" , msg: ChainSyncMessage | Error ): boolean
    
    /**
     * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
     * 
     * @returns {true} `false` if event is cancelable, and at least one of the event handlers which received event called Event.preventDefault(). Otherwise `true`.
     */
    dispatchEvent( evt: "rollBackwards"        , msg: ChainSyncRollBackwards ): boolean
    dispatchEvent( evt: "rollForward"          , msg: ChainSyncRollForward ): boolean
    dispatchEvent( evt: "intersectFound"       , msg: ChainSyncIntersectFound ): boolean
    dispatchEvent( evt: "intersectNotFound"    , msg: ChainSyncIntersectNotFound ): boolean
    dispatchEvent( evt: "awaitReply"           , msg: ChainSyncAwaitReply ): boolean
    dispatchEvent( evt: "error"                , err: Error ): boolean
    dispatchEvent( evt: ChainSyncServerEvtName , msg: ChainSyncMessage ): boolean
}

export class ChainSyncServer
{
    readonly mplexer: Multiplexer;

    clearListeners!: ( event   ?: ChainSyncServerEvtName ) => this;

    addEventListener:    <EvtName extends AnyChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends AnyChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends AnyChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends AnyChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends AnyChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends AnyChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends AnyChainSyncServerEvtName>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: ChainSyncServerEvtName ) => this
    emit:                <EvtName extends ChainSyncServerEvtName>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends ChainSyncServerEvtName>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    
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

    constructor(
        multiplexer: Multiplexer,
        chainDb: IChainDb
    )
    {
        const self = this;

        const eventListeners: ChainSyncServerEvtListeners = {
            rollBackwards: [],
            rollForward: [],
            intersectFound: [],
            intersectNotFound: [],
            awaitReply: [],
            error: []
        };

        const onceEventListeners: ChainSyncServerEvtListeners = {
            rollBackwards: [],
            rollForward: [],
            intersectFound: [],
            intersectNotFound: [],
            awaitReply: [],
            error: []
        };

        function clearListeners( evt?: ChainSyncServerEvtName ): typeof self
        {
            if( isAnyChainSyncServerEvtName( evt ) )
            {
                eventListeners[evt].length = 0;
                onceEventListeners[evt].length = 0;
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

        /** @deprecated */
        function onRollBackwards( cb: ( msg: ChainSyncRollBackwards ) => void ): void
        {
            eventListeners.rollBackwards.push( cb );
        }
        /** @deprecated */
        function onRollForward( cb: ( msg: ChainSyncRollForward ) => void ): void
        {
            eventListeners.rollForward.push( cb );
        }
        /** @deprecated */
        function onIntersectFound( cb: ( msg: ChainSyncIntersectFound ) => void ): void
        {
            eventListeners.intersectFound.push( cb );
        }
        /** @deprecated */
        function onIntersectNotFound( cb: ( msg: ChainSyncIntersectNotFound ) => void ): void
        {
            eventListeners.intersectNotFound.push( cb );
        }
        /** @deprecated */
        function onAwaitReply( cb: ( msg: ChainSyncAwaitReply ) => void ): void
        {
            eventListeners.awaitReply.push( cb );
        }

        function addEventListenerOnce( evt: AnyChainSyncServerEvtName, listener: AnyChainSyncServerEvtListener ): typeof self
        {
            if( !isAnyChainSyncServerEvtName( evt ) ) return self;

            onceEventListeners[ evt ].push( listener as any );
            return self;
        }
        function addEventListener( evt: AnyChainSyncServerEvtName, listener: ChainSyncServerEvtListener, opts?: AddEvtListenerOpts ): typeof self
        {
            if( opts?.once === true ) return addEventListenerOnce( evt, listener );
            
            if( !isAnyChainSyncServerEvtName( evt ) ) return self;
            
            eventListeners[ evt ].push( listener as any );
            return self;
        }
        function removeEventListener( evt: AnyChainSyncServerEvtName, listener: ChainSyncServerEvtListener ): typeof self
        {
            if( !isAnyChainSyncServerEvtName( evt ) ) return self;

            eventListeners[evt] = eventListeners[evt].filter( fn => fn !== listener ) as any;
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener ) as any;
            return self; 
        }

        function dispatchEvent( evt: AnyChainSyncServerEvtName, msg: ChainSyncMessage | Error ): boolean
        {
            // console.log( evt, msg );
            if( !isAnyChainSyncServerEvtName( evt ) ) return true;
            if( evt !== "error" && !isChainSyncMessage( msg ) ) return true;

            const listeners = eventListeners[ evt ];
            const nListeners = listeners.length;
            for(let i = 0; i < nListeners; i++)
            {
                listeners[i](msg as any);
            }

            const onceListeners = onceEventListeners[evt];
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

                offset = thing.offset;

                // console.log( "msg byetes", offset, toHex( chunk.subarray( 0, offset ) ) );
                // Error.stackTraceLimit = 0;
                try {
                    msg = chainSyncMessageFromCborObj( thing.parsed );
                    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
                    msg.cborBytes = Uint8Array.prototype.slice.call( chunk, 0, offset );
                    
                    queque.unshift( msg );
                }
                catch (e)
                {
                    // before dispatch event
                    Error.stackTraceLimit = originalSTLimit;

                    const err = new Error(
                        typeof e?.message === "string" ? e.message : "" +
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

            let msgStr: ChainSyncServerEvtName;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }
        });

        this.on("requestNext", ( msg: ChainSyncRequestNext ) => {
            // console.log("requestNext", msg);
        });
        this.on("findIntersect", ( msg: ChainSyncFindIntersect ) => this.handleFindIntersect( msg ) );

        this.on("done", ( msg: ChainSyncMessageDone ) => {});
    }

    clientBlockNo: number;

    sendRollForward( point: IChainPoint ): void
    {
        this.clientBlockNo = this.clientBlockNo + 1;
    }

    sendRollBackwards( point: IChainPoint ): void
    {
        this.clientBlockNo = this.clientBlockNo - nBlockBack;
    }

    sendAwaitReply( point: IChainPoint ): void
    {

    }

    sendIntersectFound( point: IChainPoint ): void
    {
        this.clientBlockNo = this.clientBlockNo - nBlockBack;

    }

    sendIntersectNotFound( point: IChainPoint ): void
    {

    }

    async handleFindIntersect( msg: ChainSyncFindIntersect ): Promise<void>
    {
        const { a, b } = msg;
        const intersect = await this.volatile.findIntersect( a, b );

        if( intersect )
        {
            this.sendIntersectFound( intersect );
        }
        else
        {
            this.sendIntersectNotFound( a );
        }
    }
}