import {
    Effect,
    Fiber,
    HashMap,
    Layer,
    Option,
    PubSub,
    Ref,
    Schema,
    Scope,
    ServiceMap,
    Stream,
} from "effect";
import * as Socket from "effect/unstable/socket/Socket";

import { wrap_multiplexer_message } from "wasm-plexer";

import { MiniProtocol } from "../MiniProtocol";
import { MultiplexerBuffer } from "./Buffer";
import { MultiplexerEncodingError, MultiplexerHeaderError } from "./Errors";

/**
 * Protocol channel for streaming messages
 */
export interface ProtocolChannel {
    readonly protocolId: MiniProtocol;
    readonly incoming: Stream.Stream<Uint8Array, never, Scope.Scope>;
    readonly send: (
        data: Uint8Array,
    ) => Effect.Effect<
        void,
        MultiplexerEncodingError | Socket.SocketError,
        Scope.Scope
    >;
}

/**
 * Effect-TS Multiplexer service
 */
export class Multiplexer extends ServiceMap.Service<Multiplexer, {
    /**
     * Get a protocol channel for streaming messages
     */
    getProtocolChannel: (protocolId: MiniProtocol) => Effect.Effect<
        ProtocolChannel,
        MultiplexerHeaderError | Socket.SocketError | Schema.SchemaError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/Multiplexer") {
    static readonly layer = Layer.effect(
        Multiplexer,
        Effect.acquireRelease(
            Effect.gen(function* () {
                const socket = yield* Socket.Socket;
                const channels = HashMap.fromIterable([
                    [
                        MiniProtocol.BlockFetch,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.ChainSync,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.Handshake,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.KeepAlive,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.LocalChainSync,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.LocalStateQuery,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.LocalTxMonitor,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.LocalTxSubmission,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.PeerSharing,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                    [
                        MiniProtocol.TxSubmission,
                        yield* PubSub.unbounded<Uint8Array>(),
                    ],
                ]);

                const mb = yield* Ref.make(yield* MultiplexerBuffer);

                const fetchFiber = yield* mb.pipe(
                    Ref.get,
                    Effect.flatMap(({ appendChunk }) =>
                        socket.run(appendChunk)
                    ),
                    Effect.forever,
                    Effect.forkChild,
                );

                const processFiber = yield* mb.pipe(
                    Ref.get,
                    Effect.flatMap(({ processedFrames }) => processedFrames()),
                    Effect.flatMap(
                        Effect.forEach(
                            (frame) =>
                                channels.pipe(
                                    HashMap.get(frame.protocol),
                                    Option.match({
                                        onNone: () =>
                                            Effect.fail(
                                                new MultiplexerHeaderError({
                                                    operation: "Decode frames",
                                                    data: {
                                                        _tag: "Parsed",
                                                        frame,
                                                    },
                                                    cause: new Error(
                                                        `Invalid frame header`,
                                                    ),
                                                }),
                                            ),
                                        onSome: (ps) =>
                                            ps.pipe(
                                                PubSub.publish(frame.payload),
                                            ),
                                    }),
                                ),
                        ),
                    ),
                    Effect.forever,
                    Effect.forkChild,
                );

                return {
                    socket,
                    channels,
                    fetchFiber,
                    processFiber,
                };
            }),
            ({ fetchFiber, processFiber }) =>
                Fiber.interrupt(fetchFiber).pipe(
                    Effect.andThen(Fiber.interrupt(processFiber)),
                ),
        ).pipe(
            Effect.map(({ socket, channels }) => ({
                getProtocolChannel: Effect.fn("Multiplexer.getProtocolChannel")(
                    (protocolId: MiniProtocol) =>
                        channels.pipe(
                            HashMap.get(protocolId),
                            Option.match({
                                onNone: () =>
                                    Effect.die(
                                        new Error(
                                            `Protocol channel not initialized for protocol ID: ${protocolId}`,
                                        ),
                                    ),
                                onSome: (ps) =>
                                    Effect.succeed({
                                        protocolId,
                                        incoming: Stream.fromPubSub(ps),
                                        send: Effect.fn(`${protocolId}.send`)(
                                            (data: Uint8Array) =>
                                                Effect.try({
                                                    try: () =>
                                                        wrap_multiplexer_message(
                                                            data,
                                                            protocolId,
                                                            true,
                                                        ),
                                                    catch: (e) =>
                                                        new MultiplexerEncodingError(
                                                            {
                                                                operation:
                                                                    "Frame wrapping",
                                                                payload: data,
                                                                protocol:
                                                                    protocolId,
                                                                cause: e,
                                                            },
                                                        ),
                                                }).pipe(
                                                    Effect.flatMap((
                                                        framedData,
                                                    ) => socket.writer.pipe(
                                                        Effect.flatMap((
                                                            write,
                                                        ) => write(framedData)),
                                                    )),
                                                ),
                                        ),
                                    }),
                            }),
                        ),
                ),
            })),
        ),
    );
}
