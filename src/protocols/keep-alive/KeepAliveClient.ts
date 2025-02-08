import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { fromHex } from "@harmoniclabs/uint8array-utils";
import { KeepAliveMessage, keepAliveMessageFromCborObj } from "./KeepAliveMessage";
import { KeepAliveDone, KeepAliveRequest, KeepAliveResponse } from "./messages";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

const agencyHeader = {
    hasAgency: true,
    protocol: MiniProtocol.KeepAlive
};


type KeepAliveClientEvtListener = ( msg: KeepAliveMessage ) => void;

type KeepAliveClientEvtListeners = {
    request: KeepAliveClientEvtListener[],
    response: KeepAliveClientEvtListener[],
    done: KeepAliveClientEvtListener[],
    error: (( err: Error ) => void)[],
};


function _clearListeners( listeners: KeepAliveClientEvtListeners, evt?: KeepAliveClientEvt | undefined ): void
{
    if( typeof evt === "string" && Array.isArray(listeners[evt]) )
    {
        listeners[evt].length = 0;
        return;
    }
    listeners.done.length = 0;
    listeners.request.length = 0;
    listeners.response.length = 0;
    listeners.error.length = 0;
}

function _hasListeners( listeners: KeepAliveClientEvtListeners ): boolean
{
    return (
        listeners.done.length > 0 ||
        listeners.request.length > 0 ||
        listeners.response.length > 0 ||
        listeners.error.length > 0
    )
}

type KeepAliveClientEvt = keyof KeepAliveClientEvtListeners;

function msgToName( msg: KeepAliveMessage ): KeepAliveClientEvt | undefined
{
    if( msg instanceof KeepAliveDone ) return "done";
    if( msg instanceof KeepAliveRequest ) return "request";
    if( msg instanceof KeepAliveResponse ) return "response";

    return undefined;
}

type EvtListenerOf<Evt extends KeepAliveClientEvt> = ( ...args: any[] ) => any
type MsgOf<Evt extends KeepAliveClientEvt> = {}

export class KeepAliveClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: () => this;

    addEventListener:    <EvtName extends KeepAliveClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends KeepAliveClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends KeepAliveClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends KeepAliveClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends KeepAliveClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends KeepAliveClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends KeepAliveClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: KeepAliveClientEvt ) => this
    emit:                <EvtName extends KeepAliveClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends KeepAliveClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean

    constructor( multiplexer: Multiplexer )
    {
        const self = this;

        const eventListeners: KeepAliveClientEvtListeners = {
            done: [],
            request: [],
            response: [],
            error: []
        };
        const onceEventListeners: KeepAliveClientEvtListeners = {
            done: [],
            request: [],
            response: [],
            error: []
        };

        function hasEventListeners(): boolean
        {
            return _hasListeners( eventListeners ) || _hasListeners( onceEventListeners );
        }

        function clearListeners( evt?: KeepAliveClientEvt | undefined )
        {
            _clearListeners( eventListeners, evt );
            _clearListeners( onceEventListeners, evt );
        }
        function addEventListenerOnce<EvtName extends KeepAliveClientEvt>(
            evt: EvtName,
            listener: EvtListenerOf<EvtName>
        ): typeof self
        {
            const listeners = onceEventListeners[ evt ];
            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );
            return self;
        }
        function addEventListener<EvtName extends KeepAliveClientEvt>(
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
        function removeEventListener<EvtName extends KeepAliveClientEvt>(
            evt: EvtName, 
            listener: EvtListenerOf<EvtName>
        ): typeof self
        {
            let listeners = eventListeners[evt];
            if( !Array.isArray( listeners ) ) return self;
            eventListeners[evt] = listeners.filter( fn => fn !== listener ) as any;
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener ) as any;
            return self;
        }

        function dispatchEvent( evt: KeepAliveClientEvt, msg: KeepAliveMessage )
        {
            let listeners = eventListeners[ evt ];
            if( !listeners ) return;
            for( const cb of listeners ) cb( msg as any );
            const nListeners = listeners.length;
            listeners = onceEventListeners[ evt ];
            if( evt === "error" && nListeners + listeners.length === 0 )
            {
                throw msg instanceof Error ? msg : new Error( "Unhandled error: " + msg );
            }
            let cb: ( ...args: any[] ) => any;
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
        const queque: KeepAliveMessage[] = [];

        multiplexer.on( MiniProtocol.KeepAlive, chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: KeepAliveMessage;

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

                msg = keepAliveMessageFromCborObj( thing.parsed )
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

            let msgStr: KeepAliveClientEvt;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }
        });
    }

    done(): void
    {
        this.mplexer.send(
            new KeepAliveDone().toCbor().toBuffer(),
            agencyHeader
        );
    }

    request( cookie: number | bigint ): Promise<KeepAliveResponse>
    {
        const self = this;
        return new Promise( resolve => {
            function handleResponse( response: KeepAliveResponse )
            {
                self.removeEventListener("response", handleResponse);
                resolve( response );
            }
            self.addEventListener("response", handleResponse)
            
            self.mplexer.send(
                new KeepAliveRequest({ cookie }).toCbor().toBuffer(),
                agencyHeader
            );
        });
    }
}