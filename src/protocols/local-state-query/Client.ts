import {
    Cause,
    Duration,
    Effect,
    Layer,
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
import { ChainPoint } from "../types/ChainPoint";
import * as Schemas from "./Schemas";

export class LocalStateQueryError
    extends Schema.TaggedErrorClass<LocalStateQueryError>()(
        "LocalStateQueryError",
        {
            cause: Schema.Defect,
        },
    ) {}

export class AcquireFailure
    extends Schema.TaggedErrorClass<AcquireFailure>()("AcquireFailure", {
        failure: Schema.Uint8Array,
    }) {}

type QueryState = "Idle" | "Acquiring" | "Acquired" | "Querying" | "Done";

const decodeMessage = Schema.decodeUnknownEffect(
    Schemas.LocalStateQueryMessageBytes,
);
const encodeMessage = Schema.encodeUnknownEffect(
    Schemas.LocalStateQueryMessageBytes,
);

export class LocalStateQueryClient
    extends ServiceMap.Service<LocalStateQueryClient, {
        acquire: (point?: ChainPoint) => Effect.Effect<
            void,
            | AcquireFailure
            | LocalStateQueryError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        query: (query: Uint8Array) => Effect.Effect<
            Uint8Array,
            | LocalStateQueryError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        reAcquire: (point?: ChainPoint) => Effect.Effect<
            void,
            | AcquireFailure
            | LocalStateQueryError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        release: () => Effect.Effect<
            void,
            | LocalStateQueryError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError,
            Scope.Scope
        >;
        done: () => Effect.Effect<
            void,
            | LocalStateQueryError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError,
            Scope.Scope
        >;
    }>()("@harmoniclabs/ouroboros-miniprotocols-ts/LocalStateQueryClient") {
    static readonly layer = Layer.effect(
        LocalStateQueryClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.LocalStateQuery,
            ).pipe(
                Effect.mapError((cause) => new LocalStateQueryError({ cause })),
            );
            const state = yield* Ref.make<QueryState>("Idle");

            const inbox = yield* Queue.unbounded<Schemas.LocalStateQueryMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.LocalStateQueryMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            const guardState = (expected: QueryState) =>
                Ref.get(state).pipe(
                    Effect.flatMap((current) =>
                        current !== expected
                            ? Effect.fail(
                                new LocalStateQueryError({
                                    cause:
                                        `Invalid state: expected ${expected}, got ${current}`,
                                }),
                            )
                            : Effect.void
                    ),
                );

            return LocalStateQueryClient.of({
                acquire: Effect.fn("LocalStateQueryClient.acquire")(
                    function* (point?: ChainPoint) {
                        yield* guardState("Idle");
                        yield* Ref.set(state, "Acquiring");

                        yield* sendMessage({
                            _tag: Schemas.LocalStateQueryMessageType.Acquire,
                            point,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            response._tag ===
                                Schemas.LocalStateQueryMessageType.Acquired
                        ) {
                            yield* Ref.set(state, "Acquired");
                            return;
                        }

                        if (
                            response._tag ===
                                Schemas.LocalStateQueryMessageType.Failure
                        ) {
                            yield* Ref.set(state, "Idle");
                            return yield* Effect.fail(
                                new AcquireFailure({
                                    failure: response.failure,
                                }),
                            );
                        }

                        return yield* Effect.fail(
                            new LocalStateQueryError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                query: Effect.fn("LocalStateQueryClient.query")(
                    function* (query: Uint8Array) {
                        yield* guardState("Acquired");
                        yield* Ref.set(state, "Querying");

                        yield* sendMessage({
                            _tag: Schemas.LocalStateQueryMessageType.Query,
                            query,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        yield* Ref.set(state, "Acquired");

                        if (
                            response._tag ===
                                Schemas.LocalStateQueryMessageType.Result
                        ) {
                            return response.result;
                        }

                        return yield* Effect.fail(
                            new LocalStateQueryError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                reAcquire: Effect.fn("LocalStateQueryClient.reAcquire")(
                    function* (point?: ChainPoint) {
                        yield* guardState("Acquired");
                        yield* Ref.set(state, "Acquiring");

                        yield* sendMessage({
                            _tag: Schemas.LocalStateQueryMessageType.ReAcquire,
                            point,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            response._tag ===
                                Schemas.LocalStateQueryMessageType.Acquired
                        ) {
                            yield* Ref.set(state, "Acquired");
                            return;
                        }

                        if (
                            response._tag ===
                                Schemas.LocalStateQueryMessageType.Failure
                        ) {
                            yield* Ref.set(state, "Idle");
                            return yield* Effect.fail(
                                new AcquireFailure({
                                    failure: response.failure,
                                }),
                            );
                        }

                        return yield* Effect.fail(
                            new LocalStateQueryError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                release: Effect.fn("LocalStateQueryClient.release")(
                    function* () {
                        yield* guardState("Acquired");
                        yield* sendMessage({
                            _tag: Schemas.LocalStateQueryMessageType.Release,
                        });
                        yield* Ref.set(state, "Idle");
                    },
                ),
                done: Effect.fn("LocalStateQueryClient.done")(
                    function* () {
                        yield* guardState("Idle");
                        yield* sendMessage({
                            _tag: Schemas.LocalStateQueryMessageType.Done,
                        });
                        yield* Ref.set(state, "Done");
                    },
                ),
            });
        }),
    );
}
