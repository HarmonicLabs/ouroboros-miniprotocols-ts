import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer";
import { AddEvtListenerOpts } from "../../common/AddEvtListenerOpts";
import { PeerSharingMessage, peerSharingMessageFromCborObj } from "./PeerSharingMessage";
import { PeerSharingRequest, PeerSharingResponse, PeerSharingDone } from "./messages";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

const agencyHeader = {
    hasAgency: true,
    protocol: MiniProtocol.PeerSharing
};


type PeerSharingClientEvtListener = ( msg: PeerSharingMessage ) => void;

type PeerSharingClientEvtListeners = {
    request: PeerSharingClientEvtListener[],
    response: PeerSharingClientEvtListener[],
    done: PeerSharingClientEvtListener[],
    error: (( err: Error ) => void)[],
};


function _clearListeners( listeners: PeerSharingClientEvtListeners, evt?: PeerSharingClientEvt | undefined ): void {
    if( typeof evt === "string" && Array.isArray(listeners[evt]) ) {
        listeners[evt].length = 0;
        return;
    }

    listeners.done.length = 0;
    listeners.request.length = 0;
    listeners.response.length = 0;
    listeners.error.length = 0;
}

function _hasListeners( listeners: PeerSharingClientEvtListeners ): boolean {
    return (
        listeners.done.length > 0 ||
        listeners.request.length > 0 ||
        listeners.response.length > 0 ||
        listeners.error.length > 0
    )
}

type PeerSharingClientEvt = keyof PeerSharingClientEvtListeners;

function msgToName( msg: PeerSharingMessage ): PeerSharingClientEvt | undefined {
    if( msg instanceof PeerSharingDone ) return "done";
    if( msg instanceof PeerSharingRequest ) return "request";
    if( msg instanceof PeerSharingResponse ) return "response";

    return undefined;
}

type EvtListenerOf<Evt extends PeerSharingClientEvt> = ( ...args: any[] ) => any
type MsgOf<Evt extends PeerSharingClientEvt> = {}

export class PeerSharingClient {

    readonly multiplexer: Multiplexer;

    clearListeners!: () => this;

    addEventListener:    <EvtName extends PeerSharingClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName>, options?: AddEvtListenerOpts ) => this
    addListener:         <EvtName extends PeerSharingClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    on:                  <EvtName extends PeerSharingClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    once:                <EvtName extends PeerSharingClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeEventListener: <EvtName extends PeerSharingClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeListener:      <EvtName extends PeerSharingClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    off:                 <EvtName extends PeerSharingClientEvt>( evt: EvtName, listener: EvtListenerOf<EvtName> ) => this
    removeAllListeners:  ( event   ?: PeerSharingClientEvt ) => this
    emit:                <EvtName extends PeerSharingClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean
    dispatchEvent:       <EvtName extends PeerSharingClientEvt>( evt: EvtName, msg: MsgOf<EvtName> ) => boolean

    constructor( thisMultiplexer: Multiplexer ) {
        const self = this;

        const eventListeners: PeerSharingClientEvtListeners = {
            done: [],
            request: [],
            response: [],
            error: []
        };

        const onceEventListeners: PeerSharingClientEvtListeners = {
            done: [],
            request: [],
            response: [],
            error: []
        };

        function hasEventListeners(): boolean {
            return _hasListeners( eventListeners ) || _hasListeners( onceEventListeners );
        }

        function clearListeners( evt?: PeerSharingClientEvt | undefined ) {
            _clearListeners( eventListeners, evt );
            _clearListeners( onceEventListeners, evt );
        }

        function addEventListenerOnce<EvtName extends PeerSharingClientEvt>(
            evt: EvtName,
            listener: EvtListenerOf<EvtName>
        ): typeof self {
            const listeners = onceEventListeners[ evt ];

            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );
            return self;
        }

        function addEventListener<EvtName extends PeerSharingClientEvt>(
            evt: EvtName,
            listener: EvtListenerOf<EvtName>,
            options?: AddEvtListenerOpts 
        ): typeof self {
            if( options?.once ) return addEventListenerOnce( evt, listener );
            
            const listeners = eventListeners[ evt ];

            if( !Array.isArray( listeners ) ) return self;

            listeners.push( listener );
            return self;
        }

        function removeEventListener<EvtName extends PeerSharingClientEvt>(
            evt: EvtName, 
            listener: EvtListenerOf<EvtName>
        ): typeof self {
            let listeners = eventListeners[evt];

            if( !Array.isArray( listeners ) ) return self;

            eventListeners[evt] = listeners.filter( fn => fn !== listener ) as any;
            onceEventListeners[evt] = onceEventListeners[evt].filter( fn => fn !== listener ) as any;
            
            return self;
        }

        function dispatchEvent( evt: PeerSharingClientEvt, msg: PeerSharingMessage ) {
            let listeners = eventListeners[ evt ];
            if( !listeners ) return;

            for( const cb of listeners ) cb( msg as any );

            listeners = onceEventListeners[ evt ];

            let cb: ( ...args: any[] ) => any;
            while( cb = listeners.shift()! ) cb( msg );

            return true;
        }

        Object.defineProperties(
            this, {
                multiplexer:            { value: thisMultiplexer, ...roDescr },
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
        const queque: PeerSharingMessage[] = [];

        thisMultiplexer.on( MiniProtocol.PeerSharing, chunk => {
            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: PeerSharingMessage;

            if( prevBytes ) {
                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( true ) {
                const originalSTLimit = Error.stackTraceLimit;
                Error.stackTraceLimit = 0;

                try {
                    thing = Cbor.parseWithOffset( chunk );
                } catch {
                    Error.stackTraceLimit = originalSTLimit;
                    // assume the error is of "missing bytes";
                    prevBytes = chunk.slice();

                    break;
                } finally {
                    Error.stackTraceLimit = originalSTLimit;
                }
                
                offset = thing.offset;

                msg = peerSharingMessageFromCborObj( thing.parsed )
                queque.unshift( msg );

                if( offset < chunk.length ) {
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );

                    continue;
                } else {
                    prevBytes = offset === chunk.length ? undefined : Uint8Array.prototype.slice.call( chunk );
                    
                    break;
                }
            }

            let msgStr: PeerSharingClientEvt;

            while( msg = queque.pop()! ) {
                msgStr = msgToName( msg )!;

                if( !msgStr ) continue; // ingore messages not expected by the client

                dispatchEvent( msgStr, msg );
            }
        });
    }

    done(): void {
        this.multiplexer.send(
            new PeerSharingDone().toCbor().toBuffer(),
            agencyHeader
        );
    }

    request( amount: number | bigint ): Promise<PeerSharingResponse> {
        const self = this;

        return new Promise( resolve => {
            function handleResponse( response: PeerSharingResponse ) {
                self.removeEventListener("response", handleResponse);
                resolve( response );
            }

            self.addEventListener("response", handleResponse)
            
            self.multiplexer.send(
                new PeerSharingRequest({ amount }).toCbor().toBuffer(),
                agencyHeader
            );
        });
    }
    
}