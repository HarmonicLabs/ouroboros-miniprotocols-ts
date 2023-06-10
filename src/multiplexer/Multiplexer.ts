import { MiniProtocol } from "../MiniProtocol";
import { SocketLike, WrappedSocket, isNode2NodeSocket, isWebSocketLike, wrapSocket } from "./SocketLike";
import { MultiplexerHeaderInfos, unwrapMultiplexerMessage, wrapMultiplexerMessage } from "./multiplexerMessage";

const MAX_RECONNECT_ATTEPMTS = 3 as const;

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

export type MultiplexerEvtListener = ( msg: Uint8Array, header: MultiplexerHeaderInfos ) => void;

type MultiplexerEvtListeners = {
    [protocol: number]: MultiplexerEvtListener[]
};

export type MultiplexerProtocolType = "node-to-node" | "node-to-client";

export interface MultiplexerConfig {
    protocolType: MultiplexerProtocolType,
    reconnect: ( this: SocketLike ) => SocketLike
}

export class Multiplexer
{
    readonly socket: WrappedSocket
    readonly isN2N: boolean

    readonly clearListeners: () => void

    onHandshake!: ( cb: MultiplexerEvtListener ) => void
    onChainSync!: ( cb: MultiplexerEvtListener ) => void
    onBlockFetch!: ( cb: MultiplexerEvtListener ) => void
    onTxSubmission!: ( cb: MultiplexerEvtListener ) => void
    onLocalStateQuery!: ( cb: MultiplexerEvtListener ) => void
    onKeepAlive!: ( cb: MultiplexerEvtListener ) => void

    send: ( payload: Uint8Array, header: MultiplexerHeaderInfos ) => void;

    constructor( socketLike: SocketLike , cfg: MultiplexerConfig )
    {
        const reconnect = cfg.reconnect;
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
            [MiniProtocol.KeepAlive]: []
        };

        function clearListeners(): void
        {
            eventListeners[MiniProtocol.Handshake]          .length = 0
            eventListeners[MiniProtocol.ChainSync]          .length = 0
            eventListeners[MiniProtocol.LocalChainSync]     .length = 0
            eventListeners[MiniProtocol.BlockFetch]         .length = 0
            eventListeners[MiniProtocol.TxSubmission]       .length = 0
            eventListeners[MiniProtocol.LocalTxSubmission]  .length = 0
            eventListeners[MiniProtocol.LocalStateQuery]    .length = 0
            eventListeners[MiniProtocol.KeepAlive]          .length = 0
        }

        socket.on("close", reconnectSocket );
        socket.on("error", (err: any) => {
            if( err ){
                throw err;
            }
        });
        socket.on("data", (chunk) => {

            const { header, payload } = unwrapMultiplexerMessage( chunk );

            for( const cb of eventListeners[header.protocol] )
            {
                void cb( payload, header );
            }

        });

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