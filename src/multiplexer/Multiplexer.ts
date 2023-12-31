import { toHex } from "@harmoniclabs/uint8array-utils";
import { MiniProtocol, MiniProtocolNum, MiniProtocolStr, isMiniProtocol, isMiniProtocolNum, isMiniProtocolStr, miniProtocolToNumber, miniProtocolToString } from "../MiniProtocol";
import { SocketLike, WrappedSocket, isNode2NodeSocket, isWebSocketLike, wrapSocket } from "./SocketLike";
import { MultiplexerHeader, MultiplexerHeaderInfos, unwrapMultiplexerMessages, wrapMultiplexerMessage } from "./multiplexerMessage";
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

    /** @deprecated */
    onHandshake!: ( cb: MultiplexerEvtListener ) => void
    /** @deprecated */
    onChainSync!: ( cb: MultiplexerEvtListener ) => void
    /** @deprecated */
    onBlockFetch!: ( cb: MultiplexerEvtListener ) => void
    /** @deprecated */
    onTxSubmission!: ( cb: MultiplexerEvtListener ) => void
    /** @deprecated */
    onLocalStateQuery!: ( cb: MultiplexerEvtListener ) => void
    /** @deprecated */
    onKeepAlive!: ( cb: MultiplexerEvtListener ) => void

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

        function forwardMessage(chunk: Uint8Array)
        {
            const messages = unwrapMultiplexerMessages( chunk );
            for( const { header, payload } of messages )
            {
                if( !isMiniProtocol( header.protocol ) )
                {
                    const errorCbs = eventListeners.error;
                    const err = new Error(
                        "unwrapped Multiplexer header was not a mini protocol;\nmultiplexer chunk received: " + 
                        toHex( Uint8Array.prototype.slice.call( chunk ) )
                    );
    
                    dispatchEvent( "error", err )
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

        /** @deprecated */
        function onHandshake( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.Handshake].push( cb );
        }
        /** @deprecated */
        function onChainSync( cb: MultiplexerEvtListener )
        {
            eventListeners[
                isN2N ?
                MiniProtocol.ChainSync :
                MiniProtocol.LocalChainSync
            ].push( cb );
        }
        /** @deprecated */
        function onBlockFetch( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.BlockFetch].push( cb );
        }
        /** @deprecated */
        function onTxSubmission( cb: MultiplexerEvtListener )
        {
            eventListeners[
                isN2N ?
                MiniProtocol.TxSubmission :
                MiniProtocol.LocalTxSubmission
            ].push( cb );
        }
        /** @deprecated */
        function onLocalStateQuery( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.LocalStateQuery].push( cb );
        }
        /** @deprecated */
        function onKeepAlive( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.KeepAlive].push( cb );
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
            const nListeners = listeners.length;
            for(let i = 0; i < nListeners; i++)
            {
                // @ts-ignore
                listeners[i]( ...args );
            }

            const onceListeners = onceEventListeners[evt as MiniProtocol];
            while( onceListeners.length > 0 )
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
                onHandshake:            { value: onHandshake, ...roDescr },
                onChainSync:            { value: onChainSync, ...roDescr },
                onBlockFetch:           { value: onBlockFetch, ...roDescr },
                onTxSubmission:         { value: onTxSubmission, ...roDescr },
                onLocalStateQuery:      { value: onLocalStateQuery, ...roDescr },
                onKeepAlive:            { value: onKeepAlive, ...roDescr },
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