import { toHex } from "@harmoniclabs/uint8array-utils";
import { MiniProtocol, MiniProtocolNum, MiniProtocolStr, isMiniProtocol, isMiniProtocolNum, isMiniProtocolStr, miniProtocolToNumber, miniProtocolToString } from "../MiniProtocol";
import { SocketLike, WrappedSocket, isNode2NodeSocket, isWebSocketLike, wrapSocket } from "./SocketLike";
import { MultiplexerHeader, MultiplexerHeaderInfos, MultiplexerMessage, unwrapMultiplexerMessages, wrapMultiplexerMessage } from "./multiplexerMessage";
import { ErrorListener } from "../common/ErrorListener";
import { AddEvtListenerOpts } from "../common/AddEvtListenerOpts";

const MAX_RECONNECT_ATTEPMTS = 3 as const;

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

export type MultiplexerEvtListener = ( payload: Uint8Array, header: MultiplexerHeader ) => void;

type MultiplexerEvtListeners = {
    [MiniProtocol.BlockFetch]: MultiplexerEvtListener[]
    [MiniProtocol.ChainSync]: MultiplexerEvtListener[]
    [MiniProtocol.Handshake]: MultiplexerEvtListener[]
    [MiniProtocol.KeepAlive]: MultiplexerEvtListener[]
    [MiniProtocol.LocalChainSync]: MultiplexerEvtListener[]
    [MiniProtocol.LocalStateQuery]: MultiplexerEvtListener[]
    [MiniProtocol.LocalTxSubmission]: MultiplexerEvtListener[]
    [MiniProtocol.TxSubmission]: MultiplexerEvtListener[]
    [MiniProtocol.LocalTxMonitor]: MultiplexerEvtListener[]
    error: (( err: Error ) => void)[]
};

export type MultiplexerProtocolType = "node-to-node" | "node-to-client";

export interface MultiplexerConfig {
    protocolType: MultiplexerProtocolType,
    connect: () => SocketLike
}

export type MultiplexerCloseOptions = {
    /**
     * @default true
    **/
    closeSocket: boolean
}

export type MplexerEvtName = "error" | MiniProtocol | MiniProtocolStr | MiniProtocolNum;

export function isMplexerEvtName( thing: any ): thing is MplexerEvtName
{
    return (
        thing === "error" ||
        isMiniProtocolStr( thing ) ||
        isMiniProtocolNum( thing )
    )
}

export type AnyMplexerListener = MultiplexerEvtListener | ErrorListener

export type MplexerListenerOf<Evt extends MplexerEvtName> = 
    Evt extends "error" ? ErrorListener :
    MultiplexerEvtListener;

export type ArgsOf<Evt extends MplexerEvtName> = 
    Evt extends "error" ? [ err: Error ] :
    [ payload: Uint8Array, header: MultiplexerHeader ];

export class Multiplexer
{
    readonly socket: WrappedSocket
    readonly isN2N: boolean

    readonly clearListeners: ( protocol?: MiniProtocol ) => void

    addEventListener    : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt>, opts?: AddEventListenerOptions ) => this
    addListener         : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => this
    on                  : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => this
    once                : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => this
    removeEventListener : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => this
    removeListener      : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => this
    off                 : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => this
    removeAllListeners  : <Evt extends MplexerEvtName>( evt?: Evt ) => this
    emit                : <Evt extends MplexerEvtName>( evt: Evt, ...args: ArgsOf<Evt> ) => boolean
    dispatchEvent       : <Evt extends MplexerEvtName>( evt: Evt, ...args: ArgsOf<Evt> ) => boolean

    send: ( payload: Uint8Array, header: MultiplexerHeaderInfos ) => void;

    close: ( options?: MultiplexerCloseOptions ) => void;
    isClosed: () => boolean

    constructor( cfg: MultiplexerConfig )
    {
        const self = this
        const reconnect = cfg.connect;
        const socketLike = reconnect();
        let socket = wrapSocket( socketLike, reconnect );
        const isN2N: boolean = cfg.protocolType !== "node-to-client";
        
        function reconnectSocket(): void
        {
            if( socket.isClosed() )
            {
                socket = wrapSocket( socket.reconnect(), reconnect );
            }
        }

        function normalizeEventName( evt: MplexerEvtName ): "error" | MiniProtocol
        {
            if( !isMplexerEvtName( evt ) )
            {
                dispatchEvent( "error", new Error("unknown multiplexer event: " + evt));
                return "error";
            }
            if( evt === "error" ) return evt;
            evt = miniProtocolToNumber( evt ) as MiniProtocolNum;

            if(
                evt === MiniProtocol.Handshake          ||
                evt === MiniProtocol.BlockFetch         ||
                evt === MiniProtocol.LocalStateQuery    ||
                evt === MiniProtocol.KeepAlive
            ) return evt;

            if( isN2N )
            {
                if( evt === MiniProtocol.LocalChainSync )       evt = MiniProtocol.ChainSync;
                if( evt === MiniProtocol.LocalTxSubmission )    evt = MiniProtocol.TxSubmission;
            }
            else // node-to-client
            {
                if( evt === MiniProtocol.ChainSync )    evt = MiniProtocol.LocalChainSync;
                if( evt === MiniProtocol.TxSubmission ) evt = MiniProtocol.LocalTxSubmission;
            }

            return evt;
        }

        const eventListeners: MultiplexerEvtListeners = {
            [MiniProtocol.Handshake]: [],
            [MiniProtocol.ChainSync]: [],
            [MiniProtocol.LocalChainSync]: [],
            [MiniProtocol.BlockFetch]: [],
            [MiniProtocol.TxSubmission]: [],
            [MiniProtocol.LocalTxSubmission]: [],
            [MiniProtocol.LocalStateQuery]: [],
            [MiniProtocol.KeepAlive]: [],
            [MiniProtocol.LocalTxMonitor]: [],
            error: []
        };

        const onceEventListeners: MultiplexerEvtListeners = {
            [MiniProtocol.Handshake]: [],
            [MiniProtocol.ChainSync]: [],
            [MiniProtocol.LocalChainSync]: [],
            [MiniProtocol.BlockFetch]: [],
            [MiniProtocol.TxSubmission]: [],
            [MiniProtocol.LocalTxSubmission]: [],
            [MiniProtocol.LocalStateQuery]: [],
            [MiniProtocol.KeepAlive]: [],
            [MiniProtocol.LocalTxMonitor]: [],
            error: []
        };

        function handleSocketError( thing: Error | Event ): void
        {
            const err = new Error("socket error");
            (err as any).data = thing;
            dispatchEvent("error", err);
            return;
        }

        let prevBytes: Uint8Array | undefined = undefined;
        let prevHeader: MultiplexerHeader | undefined = undefined;

        function forwardMessage( chunk: Uint8Array ): void
        {
            if( prevBytes )
            {
                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }
            
            let messages: MultiplexerMessage[];
            if( prevHeader )
            {
                if( chunk.length < prevHeader.payloadLength )
                {
                    // not enough bytes to cover message
                    // remember for later
                    prevBytes = chunk;

                    // exit `forwardMessage` without sending any event.
                    return;
                }

                messages = [
                    {
                        header: prevHeader,
                        payload: Uint8Array.prototype.slice.call( chunk, 0, prevHeader.payloadLength )
                    }
                ];

                chunk = Uint8Array.prototype.subarray.call( chunk, prevHeader.payloadLength, chunk.length );
                prevHeader = undefined;
            }
            else messages = [];

            // finally add any other message if present
            messages = messages.concat( unwrapMultiplexerMessages( chunk ) );

            for( const { header, payload } of messages )
            {
                if( header.payloadLength > payload.length )
                {
                    prevBytes = payload;
                    prevHeader = header;
                    break;
                }

                if( !isMiniProtocol( header.protocol ) )
                {
                    const err = new Error(
                        "unwrapped Multiplexer header was not a mini protocol;\nmultiplexer chunk received: " + 
                        toHex( Uint8Array.prototype.slice.call( chunk ) )
                    );
    
                    dispatchEvent( "error", err );
                    return;
                }
    
                dispatchEvent( header.protocol, payload, header );
            }
        }

        function clearListeners( protocol?: MplexerEvtName ): void
        {
            if( protocol !== undefined )
            {
                protocol = protocol === "error" ? protocol : miniProtocolToNumber( protocol ) as MiniProtocol;
                eventListeners[protocol].length = 0;
                onceEventListeners[protocol].length = 0;
                return;
            }
            // else (protocol === undefined)
            eventListeners[MiniProtocol.Handshake]          .length = 0;
            eventListeners[MiniProtocol.ChainSync]          .length = 0;
            eventListeners[MiniProtocol.LocalChainSync]     .length = 0;
            eventListeners[MiniProtocol.BlockFetch]         .length = 0;
            eventListeners[MiniProtocol.TxSubmission]       .length = 0;
            eventListeners[MiniProtocol.LocalTxSubmission]  .length = 0;
            eventListeners[MiniProtocol.LocalStateQuery]    .length = 0;
            eventListeners[MiniProtocol.KeepAlive]          .length = 0;
            eventListeners.error                            .length = 0;

            onceEventListeners[MiniProtocol.Handshake]          .length = 0;
            onceEventListeners[MiniProtocol.ChainSync]          .length = 0;
            onceEventListeners[MiniProtocol.LocalChainSync]     .length = 0;
            onceEventListeners[MiniProtocol.BlockFetch]         .length = 0;
            onceEventListeners[MiniProtocol.TxSubmission]       .length = 0;
            onceEventListeners[MiniProtocol.LocalTxSubmission]  .length = 0;
            onceEventListeners[MiniProtocol.LocalStateQuery]    .length = 0;
            onceEventListeners[MiniProtocol.KeepAlive]          .length = 0;
            onceEventListeners.error                            .length = 0;
        }

        socket.on("close", reconnectSocket );
        socket.on("error", handleSocketError );
        socket.on("data" , forwardMessage  );

        let _wasClosed: boolean = false;

        function close( options?: MultiplexerCloseOptions ): void
        {
            socket.off("close", reconnectSocket );
            socket.off("error", handleSocketError );
            socket.off("data" , forwardMessage  );

            const closeSocket =
                options ? 
                ( options.closeSocket === false ? false : true ) : 
                true;

            if( closeSocket && !socket.isClosed() ) socket.close();

            _wasClosed = true;
        }

        function isClosed(): boolean { return _wasClosed; }

        function send( payload: Uint8Array, header: MultiplexerHeaderInfos, attempt = 0 ): void
        {
            try{
                void socket.send(
                    wrapMultiplexerMessage(
                        payload, header
                    )
                );
            }
            catch (e) {
                attempt = Math.max( 0, Number( attempt ) );
    
                // Math.max( 0, NaN ) -> NaN
                if( !Number.isSafeInteger( attempt ) ) attempt = 0;

                if( attempt >= MAX_RECONNECT_ATTEPMTS ) throw e;
    
                reconnectSocket();

                void send( payload, header, attempt + 1 );
            }
        }

        function addEventListenerOnce<Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ): typeof self
        {
            if( !isMplexerEvtName( evt ) ) return self;
            evt = normalizeEventName( evt ) as Evt;

            if( evt === "error" )
            {
                onceEventListeners.error.push( listener as ErrorListener );
                return self;
            }

            evt = miniProtocolToNumber( evt ) as any;

            onceEventListeners[ evt as MiniProtocol ].push( listener as any );
            return self;
        }
        function addEventListener<Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt>, opts?: AddEvtListenerOpts ): typeof self
        {
            if( opts?.once ) return addEventListenerOnce( evt, listener );

            if( !isMplexerEvtName( evt ) ) return self;
            evt = normalizeEventName( evt ) as Evt;

            if( evt === "error" )
            {
                eventListeners.error.push( listener as ErrorListener );
                return self;
            }

            evt = miniProtocolToNumber( evt ) as any;

            eventListeners[ evt as MiniProtocol ].push( listener as any );
            return self;
        }
        function removeEventListener<Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ): typeof self
        {
            if( !isMplexerEvtName( evt ) ) return self;
            evt = normalizeEventName( evt ) as Evt;

            if( evt === "error" )
            {
                eventListeners.error = eventListeners.error.filter( fn => fn !== listener  );
                onceEventListeners.error = eventListeners.error.filter( fn => fn !== listener  );
                return self;
            }

            evt = miniProtocolToNumber( evt ) as any;

            eventListeners[ evt as MiniProtocol ] = eventListeners[ evt as MiniProtocol ].filter( fn => fn !== listener );
            onceEventListeners[ evt as MiniProtocol ] = eventListeners[ evt as MiniProtocol ].filter( fn => fn !== listener );
            return self;
        }
        function dispatchEvent<Evt extends MplexerEvtName>( evt: Evt, ...args: ArgsOf<Evt> ): boolean
        {
            // console.log( eventName, msg );
            if( !isMplexerEvtName( evt ) ) return true;
            evt = normalizeEventName( evt ) as Evt;

            const listeners = eventListeners[ evt as MiniProtocol ];
            const onceListeners = onceEventListeners[evt as MiniProtocol];

            const nListeners = listeners.length;
            const nOnceListeners = onceListeners.length;

            if( evt === "error" && nListeners + nOnceListeners === 0 )
            {
                throw args[0] ?? new Error("unhandled error");
            }

            for(let i = 0; i < nListeners; i++)
            {
                // @ts-ignore
                listeners[i]( ...args );
            }

            while( nOnceListeners > 0 )
            {
                // @ts-ignore
                onceListeners.shift()!( ...args );
            }

            return true;
        }

        Object.defineProperties(
            this, {
                socket: {
                    // if reconnect is called it might change (expecially with websockets)
                    get: () => socket,
                    set: () => {},
                    enumerable: true,
                    configurable: false
                },
                isN2N:                  { value: isN2N, ...roDescr },
                send:                   { value: send, ...roDescr },
                close:                  { value: close, ...roDescr },
                isClosed:               { value: isClosed, ...roDescr },
                clearListeners:         { value: clearListeners, ...roDescr },
                addEventListener:       { value: addEventListener, ...roDescr },
                addListener:            { value: addEventListener, ...roDescr },
                on:                     { value: addEventListener, ...roDescr },
                once:                   { value: addEventListenerOnce, ...roDescr },
                removeEventListener:    { value: removeEventListener, ...roDescr },
                removeListener:         { value: removeEventListener, ...roDescr },
                off:                    { value: removeEventListener, ...roDescr },
                removeAllListeners:     { value: clearListeners, ...roDescr },
                emit:                   { value: dispatchEvent, ...roDescr },
                dispatchEvent:          { value: dispatchEvent, ...roDescr },
            }
        );
    }
}