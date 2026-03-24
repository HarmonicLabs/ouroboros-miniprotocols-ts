import {
    Cause,
    Duration,
    Effect,
    Layer,
    Option,
    Queue,
    Ref,
    Schema,
    Scope,
    ServiceMap,
    Stream,
} from "effect";
import { Socket } from "effect/unstable/socket";

import { Multiplexer } from "../../multiplexer/Multiplexer";
import { MultiplexerEncodingError } from "../../multiplexer/Errors";
import { MiniProtocol } from "../../MiniProtocol";
import * as Schemas from "./Schemas";

export class LocalTxMonitorError
    extends Schema.TaggedErrorClass<LocalTxMonitorError>()(
        "LocalTxMonitorError",
        {
            cause: Schema.Defect,
        },
    ) {}

type MonitorState = "Idle" | "Acquiring" | "Acquired" | "Busy" | "Done";

const decodeMessage = Schema.decodeUnknownEffect(
    Schemas.LocalTxMonitorMessageBytes,
);
const encodeMessage = Schema.encodeUnknownEffect(
    Schemas.LocalTxMonitorMessageBytes,
);

export class LocalTxMonitorClient
    extends ServiceMap.Service<LocalTxMonitorClient, {
        acquire: () => Effect.Effect<
            number,
            | LocalTxMonitorError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        nextTx: () => Effect.Effect<
            Option.Option<Uint8Array>,
            | LocalTxMonitorError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        hasTx: (txId: Uint8Array) => Effect.Effect<
            boolean,
            | LocalTxMonitorError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        getSizes: () => Effect.Effect<
            Schemas.MempoolSizes,
            | LocalTxMonitorError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        release: () => Effect.Effect<
            void,
            | LocalTxMonitorError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError,
            Scope.Scope
        >;
        done: () => Effect.Effect<
            void,
            | LocalTxMonitorError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError,
            Scope.Scope
        >;
    }>()("@harmoniclabs/ouroboros-miniprotocols-ts/LocalTxMonitorClient") {
    static readonly layer = Layer.effect(
        LocalTxMonitorClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.LocalTxMonitor,
            ).pipe(
                Effect.mapError((cause) => new LocalTxMonitorError({ cause })),
            );
            const state = yield* Ref.make<MonitorState>("Idle");

            const inbox = yield* Queue.unbounded<Schemas.LocalTxMonitorMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.LocalTxMonitorMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            const guardState = (expected: MonitorState) =>
                Ref.get(state).pipe(
                    Effect.flatMap((current) =>
                        current !== expected
                            ? Effect.fail(
                                new LocalTxMonitorError({
                                    cause:
                                        `Invalid state: expected ${expected}, got ${current}`,
                                }),
                            )
                            : Effect.void
                    ),
                );

            return LocalTxMonitorClient.of({
                acquire: Effect.fn("LocalTxMonitorClient.acquire")(
                    function* () {
                        yield* guardState("Idle");
                        yield* Ref.set(state, "Acquiring");
                        yield* sendMessage({
                            _tag: Schemas.LocalTxMonitorMessageType.Acquire,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            response._tag ===
                                Schemas.LocalTxMonitorMessageType.Acquired
                        ) {
                            yield* Ref.set(state, "Acquired");
                            return response.slot;
                        }

                        return yield* Effect.fail(
                            new LocalTxMonitorError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                nextTx: Effect.fn("LocalTxMonitorClient.nextTx")(
                    function* () {
                        yield* guardState("Acquired");
                        yield* Ref.set(state, "Busy");
                        yield* sendMessage({
                            _tag: Schemas.LocalTxMonitorMessageType.NextTx,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );
                        yield* Ref.set(state, "Acquired");

                        if (
                            response._tag ===
                                Schemas.LocalTxMonitorMessageType.ReplyNextTx
                        ) {
                            return response.tx !== undefined
                                ? Option.some(response.tx)
                                : Option.none();
                        }

                        return yield* Effect.fail(
                            new LocalTxMonitorError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                hasTx: Effect.fn("LocalTxMonitorClient.hasTx")(
                    function* (txId: Uint8Array) {
                        yield* guardState("Acquired");
                        yield* Ref.set(state, "Busy");
                        yield* sendMessage({
                            _tag: Schemas.LocalTxMonitorMessageType.HasTx,
                            txId,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );
                        yield* Ref.set(state, "Acquired");

                        if (
                            response._tag ===
                                Schemas.LocalTxMonitorMessageType.ReplyHasTx
                        ) {
                            return response.hasTx;
                        }

                        return yield* Effect.fail(
                            new LocalTxMonitorError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                getSizes: Effect.fn("LocalTxMonitorClient.getSizes")(
                    function* () {
                        yield* guardState("Acquired");
                        yield* Ref.set(state, "Busy");
                        yield* sendMessage({
                            _tag: Schemas.LocalTxMonitorMessageType.GetSizes,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );
                        yield* Ref.set(state, "Acquired");

                        if (
                            response._tag ===
                                Schemas.LocalTxMonitorMessageType.ReplyGetSizes
                        ) {
                            return response.sizes;
                        }

                        return yield* Effect.fail(
                            new LocalTxMonitorError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                release: Effect.fn("LocalTxMonitorClient.release")(
                    function* () {
                        yield* guardState("Acquired");
                        yield* sendMessage({
                            _tag: Schemas.LocalTxMonitorMessageType.Release,
                        });
                        yield* Ref.set(state, "Idle");
                    },
                ),
                done: Effect.fn("LocalTxMonitorClient.done")(
                    function* () {
                        yield* guardState("Idle");
                        yield* sendMessage({
                            _tag: Schemas.LocalTxMonitorMessageType.Done,
                        });
                        yield* Ref.set(state, "Done");
                    },
                ),
            });
        }),
    );
}
