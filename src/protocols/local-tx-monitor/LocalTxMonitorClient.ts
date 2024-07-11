import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";
import { TxMonitorMessage, txMonitorMessageFromCborObj } from "./TxMonitorMessage";
import { TxMonitorAcquire } from "./messages/TxMonitorAcquire";
import { TxMonitorDone } from "./messages/TxMonitorDone";
import { TxMonitorGetSizes } from "./messages/TxMonitorGetSizes";
import { TxMonitorNextTx } from "./messages/TxMonitorNextTx";
import { TxMonitorRelease } from "./messages/TxMonitorRelease";
import { TxMonitorReplyGetSizes } from "./messages/TxMonitorReplyGetSizes";
import { TxMonitorReplyHasTx } from "./messages/TxMonitorReplyHasTx";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { fromHex } from "@harmoniclabs/uint8array-utils";
import { TxMonitorAcquired, TxMonitorReplyNextTx, TxMonitorHasTx } from "./messages";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

const agencyHeader = {
    hasAgency: true,
    protocol: MiniProtocol.LocalTxMonitor
};


type TxMonitorClientEvtListener = ( msg: TxMonitorMessage ) => void;

type TxMonitorClientEvtListeners = {
    done: TxMonitorClientEvtListener[],
    acquire: TxMonitorClientEvtListener[],
    acquired: TxMonitorClientEvtListener[],
    release: TxMonitorClientEvtListener[],
    nextTx: TxMonitorClientEvtListener[],
    replyNextTx: TxMonitorClientEvtListener[],
    hasTx: TxMonitorClientEvtListener[],
    replyHasTx: TxMonitorClientEvtListener[],
    getSizes: TxMonitorClientEvtListener[],
    replyGetSizes: TxMonitorClientEvtListener[],
};


function _clearListeners( listeners: TxMonitorClientEvtListeners, evt?: TxMonitorClientEvt | undefined ): void
{
    if( typeof evt === "string" && Array.isArray(listeners[evt]) )
    {
        listeners[evt].length = 0;
        return;
    }
    listeners.done.length = 0;
    listeners.acquire.length = 0;
    listeners.acquired.length = 0;
    listeners.release.length = 0;
    listeners.nextTx.length = 0;
    listeners.replyNextTx.length = 0;
    listeners.hasTx.length = 0;
    listeners.replyHasTx.length = 0;
    listeners.getSizes.length = 0;
    listeners.replyGetSizes.length = 0;
}

function _hasListeners( listeners: TxMonitorClientEvtListeners ): boolean
{
    return (
        listeners.done.length > 0 ||
        listeners.acquire.length > 0 ||
        listeners.acquired.length > 0 ||
        listeners.release.length > 0 ||
        listeners.nextTx.length > 0 ||
        listeners.replyNextTx.length > 0 ||
        listeners.hasTx.length > 0 ||
        listeners.replyHasTx.length > 0 ||
        listeners.getSizes.length > 0 ||
        listeners.replyGetSizes.length > 0
    )
}

type TxMonitorClientEvt = keyof TxMonitorClientEvtListeners;

function msgToName( msg: TxMonitorMessage ): TxMonitorClientEvt | undefined
{
    if( msg instanceof TxMonitorDone ) return "done";
    if( msg instanceof TxMonitorAcquire ) return "acquire";
    if( msg instanceof TxMonitorAcquired ) return "acquired";
    if( msg instanceof TxMonitorRelease ) return "release";
    if( msg instanceof TxMonitorNextTx ) return "nextTx";
    if( msg instanceof TxMonitorReplyNextTx ) return "replyNextTx";
    if( msg instanceof TxMonitorHasTx ) return "hasTx";
    if( msg instanceof TxMonitorReplyHasTx ) return "replyHasTx";
    if( msg instanceof TxMonitorGetSizes ) return "getSizes";
    if( msg instanceof TxMonitorReplyGetSizes ) return "replyGetSizes";

    return undefined;
}

type EvtListenerOf<Evt extends TxMonitorClientEvt> = ( ...args: any[] ) => any
type MsgOf<Evt extends TxMonitorClientEvt> = {}

export class TxMonitorClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: () => this;

    addEventListener:    <EvtName extends TxMonitorClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends TxMonitorClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends TxMonitorClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends TxMonitorClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends TxMonitorClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends TxMonitorClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends TxMonitorClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: TxMonitorClientEvt ) => this
    emit:                <EvtName extends TxMonitorClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends TxMonitorClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean

    constructor( multiplexer: Multiplexer )
    {
        const self = this;

        const eventListeners: TxMonitorClientEvtListeners = {
            done: [],
            acquire: [],
            acquired: [],
            release: [],
            nextTx: [],
            replyNextTx: [],
            hasTx: [],
            replyHasTx: [],
            getSizes: [],
            replyGetSizes: [],
        };
        const onceEventListeners: TxMonitorClientEvtListeners = {
            done: [],
            acquire: [],
            acquired: [],
            release: [],
            nextTx: [],
            replyNextTx: [],
            hasTx: [],
            replyHasTx: [],
            getSizes: [],
            replyGetSizes: [],
        };

        function hasEventListeners(): boolean
        {
            return _hasListeners( eventListeners ) || _hasListeners( onceEventListeners );
        }

        function clearListeners( evt?: TxMonitorClientEvt | undefined )
        {
            _clearListeners( eventListeners, evt );
            _clearListeners( onceEventListeners, evt );
        }
        function addEventListenerOnce<EvtName extends TxMonitorClientEvt>(
            evt: EvtName,
            listener: EvtListenerOf<EvtName>
        ): typeof self
        {
            const listeners = onceEventListeners[ evt ];
            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );
            return self;
        }
        function addEventListener<EvtName extends TxMonitorClientEvt>(
            evt: EvtName,
            listener: EvtListenerOf<EvtName>,
            options?: AddEvtListenerOpts 
        ): typeof self
        {
            if( options?.once ) return addEventListenerOnce( evt, listener );
            
            const listeners = eventListeners[ evt ];
            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );
            return self;
        }
        function removeEventListener<EvtName extends TxMonitorClientEvt>(
            evt: EvtName, 
            listener: EvtListenerOf<EvtName>
        ): typeof self
        {
            let listeners = eventListeners[evt];
            if( !Array.isArray( listeners ) ) return self;
            eventListeners[evt] = listeners.filter( fn => fn !== listener );
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener );
            return self;
        }

        function dispatchEvent( evt: TxMonitorClientEvt, msg: TxMonitorMessage )
        {
            let listeners = eventListeners[ evt ]
            if( !listeners ) return;
            for( const cb of listeners ) cb( msg );
            listeners = onceEventListeners[ evt ];
            let cb: TxMonitorClientEvtListener;
            while( cb = listeners.shift()! ) cb( msg );
            return true;
        }

        Object.defineProperties(
            this, {
                mplexer:                { value: multiplexer, ...roDescr },
                clearListeners:         { value: clearListeners, ...roDescr },
                removeAllListeners:     { value: clearListeners, ...roDescr },
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
        const queque: TxMonitorMessage[] = [];

        multiplexer.on( MiniProtocol.LocalTxMonitor, chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: TxMonitorMessage;

            if( prevBytes )
            {
                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( true )
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
                    prevBytes = chunk.slice();
                    break;
                }
                finally {
                    Error.stackTraceLimit = originalSTLimit;
                }
                
                offset = thing.offset;

                msg = txMonitorMessageFromCborObj( thing.parsed )
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

            let msgStr: TxMonitorClientEvt;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }
        });
    }

    acquire(): Promise<void>
    {
        const self = this;
        return new Promise<void>( resolve => {
            function handleAcquired()
            {
                self.removeEventListener("acquired", handleAcquired );
                resolve();
            }
            self.addEventListener("acquired", handleAcquired)
            
            self.mplexer.send(
                new TxMonitorAcquire().toCbor().toBuffer(),
                agencyHeader
            );
        });
    }

    done(): void
    {
        this.mplexer.send(
            new TxMonitorDone().toCbor().toBuffer(),
            agencyHeader
        );
    }

    release(): void
    {
        this.mplexer.send(
            new TxMonitorRelease().toCbor().toBuffer(),
            agencyHeader
        );
    }

    nextTx(): Promise<TxMonitorReplyNextTx>
    {
        const self = this;
        return new Promise( resolve => {
            function handleReply( msg: TxMonitorReplyNextTx )
            {
                self.removeEventListener("replyNextTx", handleReply);
                resolve( msg );
            }
            self.addEventListener("replyNextTx", handleReply);
            this.mplexer.send(
                new TxMonitorNextTx().toCbor().toBuffer(),
                agencyHeader
            );
        });
    }

    hasTx( hash: Uint8Array | string ): Promise<boolean>
    {
        const self = this;
        hash = hash instanceof Uint8Array ?
            new Uint8Array( hash ) :
            fromHex( hash );

        return new Promise( resolve => {
            function handleReply( msg: TxMonitorReplyHasTx )
            {
                self.removeEventListener("replyNextTx", handleReply);
                resolve( msg.hasTx );
            }
            self.addEventListener("replyNextTx", handleReply);
            this.mplexer.send(
                new TxMonitorHasTx({
                    txId: hash as Uint8Array
                }).toCbor().toBuffer(),
                agencyHeader
            );
        });
    }

    getSizes(): Promise<TxMonitorReplyGetSizes>
    {
        const self = this;
        return new Promise( resolve => {
            function handleReply( msg: TxMonitorReplyGetSizes )
            {
                self.removeEventListener("replyGetSizes", handleReply);
                resolve( msg );
            }
            self.addEventListener("replyGetSizes", handleReply);
            this.mplexer.send(
                new TxMonitorGetSizes().toCbor().toBuffer(),
                agencyHeader
            );
        })
    };

}