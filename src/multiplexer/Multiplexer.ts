import { toHex } from "@harmoniclabs/uint8array-utils";
import { MiniProtocol, MiniProtocolStr, isMiniProtocol, miniProtocolToNumber, miniProtocolToString } from "../MiniProtocol";
import { SocketLike, WrappedSocket, isNode2NodeSocket, isWebSocketLike, wrapSocket } from "./SocketLike";
import { MultiplexerHeader, MultiplexerHeaderInfos, unwrapMultiplexerMessages, wrapMultiplexerMessage } from "./multiplexerMessage";
import { ErrorListener } from "../common/ErrorListener";

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

export type MplexerEvtName = "error" | MiniProtocolStr | MiniProtocol;

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

    addEventListener    : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => void
    addListener         : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => void
    on                  : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => void
    once                : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => void
    removeEventListener : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => void
    removeListener      : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => void
    off                 : <Evt extends MplexerEvtName>( evt: Evt, listener: MplexerListenerOf<Evt> ) => void
    removeAllListeners  : <Evt extends MplexerEvtName>( evt?: Evt ) => void
    emit                : <Evt extends MplexerEvtName>( evt: Evt, ...args: ArgsOf<Evt> ) => void
    dispatchEvent       : <Evt extends MplexerEvtName>( evt: Evt, ...args: ArgsOf<Evt> ) => void

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

        const eventListeners: MultiplexerEvtListeners = {
            [MiniProtocol.Handshake]: [],
            [MiniProtocol.ChainSync]: [],
            [MiniProtocol.LocalChainSync]: [],
            [MiniProtocol.BlockFetch]: [],
            [MiniProtocol.TxSubmission]: [],
            [MiniProtocol.LocalTxSubmission]: [],
            [MiniProtocol.LocalStateQuery]: [],
            [MiniProtocol.KeepAlive]: [],
            error: []
        };

        function handleSocketError( thing: Error | Event ): void
        {
            const errorCbs = eventListeners.error;
            const err = new Error("socket error");
            (err as any).data = thing;
            for( const cb of errorCbs )
            {
                void cb( err );
            }
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
    
                    for( const cb of errorCbs )
                    {
                        void cb( err );
                    }
                    return;
                }
    
                const listeners = eventListeners[header.protocol];
                for( const cb of listeners )
                {
                    void cb( payload, header );
                }
            }
        }

        function clearListeners( protocol?: MiniProtocol | "error" ): void
        {
            if( protocol !== undefined )
            {
                protocol = protocol === "error" ? protocol : miniProtocolToNumber( protocol );
                eventListeners[protocol].length = 0;
                return;
            }
            eventListeners[MiniProtocol.Handshake]          .length = 0;
            eventListeners[MiniProtocol.ChainSync]          .length = 0;
            eventListeners[MiniProtocol.LocalChainSync]     .length = 0;
            eventListeners[MiniProtocol.BlockFetch]         .length = 0;
            eventListeners[MiniProtocol.TxSubmission]       .length = 0;
            eventListeners[MiniProtocol.LocalTxSubmission]  .length = 0;
            eventListeners[MiniProtocol.LocalStateQuery]    .length = 0;
            eventListeners[MiniProtocol.KeepAlive]          .length = 0;
            eventListeners.error                            .length = 0;
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

        function onHandshake( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.Handshake].push( cb );
        }
        function onChainSync( cb: MultiplexerEvtListener )
        {
            eventListeners[
                isN2N ?
                MiniProtocol.ChainSync :
                MiniProtocol.LocalChainSync
            ].push( cb );
        }
        function onBlockFetch( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.BlockFetch].push( cb );
        }
        function onTxSubmission( cb: MultiplexerEvtListener )
        {
            eventListeners[
                isN2N ?
                MiniProtocol.TxSubmission :
                MiniProtocol.LocalTxSubmission
            ].push( cb );
        }
        function onLocalStateQuery( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.LocalStateQuery].push( cb );
        }
        function onKeepAlive( cb: MultiplexerEvtListener )
        {
            eventListeners[MiniProtocol.KeepAlive].push( cb );
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
                isN2N: {
                    value: isN2N,
                    ...roDescr
                },
                send: {
                    value: send,
                    ...roDescr
                },
                close: {
                    value: close,
                    ...roDescr
                },
                isClosed: {
                    value: isClosed,
                    ...roDescr
                },
                onHandshake: {
                    value: onHandshake,
                    ...roDescr
                },
                onChainSync: {
                    value: onChainSync,
                    ...roDescr
                },
                onBlockFetch: {
                    value: onBlockFetch,
                    ...roDescr
                },
                onTxSubmission: {
                    value: onTxSubmission,
                    ...roDescr
                },
                onLocalStateQuery: {
                    value: onLocalStateQuery,
                    ...roDescr
                },
                onKeepAlive: {
                    value: onKeepAlive,
                    ...roDescr
                },
                clearListeners: {
                    value: clearListeners,
                    ...roDescr
                }
            }
        );
    }
}