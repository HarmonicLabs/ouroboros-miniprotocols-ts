import {
    Cause,
    Deferred,
    Duration,
    Effect,
    Layer,
    Option,
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

export class LocalChainSyncError
    extends Schema.TaggedErrorClass<LocalChainSyncError>()(
        "LocalChainSyncError",
        {
            cause: Schema.Defect,
        },
    ) {}

export type LocalChainSyncRollForward =
    & Schema.Schema.Type<typeof Schemas.LocalChainSyncMessage>
    & {
        readonly _tag: Schemas.LocalChainSyncMessageType.RollForward;
    };
export type LocalChainSyncRollBackward =
    & Schema.Schema.Type<typeof Schemas.LocalChainSyncMessage>
    & {
        readonly _tag: Schemas.LocalChainSyncMessageType.RollBackward;
    };
export type LocalChainSyncIntersectFound =
    & Schema.Schema.Type<typeof Schemas.LocalChainSyncMessage>
    & {
        readonly _tag: Schemas.LocalChainSyncMessageType.IntersectFound;
    };
export type LocalChainSyncIntersectNotFound =
    & Schema.Schema.Type<typeof Schemas.LocalChainSyncMessage>
    & {
        readonly _tag: Schemas.LocalChainSyncMessageType.IntersectNotFound;
    };

const decodeMessage = Schema.decodeUnknownEffect(
    Schemas.LocalChainSyncMessageBytes,
);
const encodeMessage = Schema.encodeUnknownEffect(
    Schemas.LocalChainSyncMessageBytes,
);

export class LocalChainSyncClient
    extends ServiceMap.Service<LocalChainSyncClient, {
        requestNext: () => Effect.Effect<
            LocalChainSyncRollForward | LocalChainSyncRollBackward,
            | LocalChainSyncError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        findIntersect: (points: ReadonlyArray<ChainPoint>) => Effect.Effect<
            LocalChainSyncIntersectFound | LocalChainSyncIntersectNotFound,
            | LocalChainSyncError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        done: () => Effect.Effect<
            void,
            | LocalChainSyncError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError,
            Scope.Scope
        >;
    }>()("@harmoniclabs/ouroboros-miniprotocols-ts/LocalChainSyncClient") {
    static readonly layer = Layer.effect(
        LocalChainSyncClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.LocalChainSync,
            ).pipe(
                Effect.mapError((cause) => new LocalChainSyncError({ cause })),
            );

            const incoming = channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
            );

            const sendMessage = (msg: Schemas.LocalChainSyncMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            return LocalChainSyncClient.of({
                requestNext: Effect.fn("LocalChainSyncClient.requestNext")(
                    function* () {
                        const response = yield* Deferred.make<
                            | LocalChainSyncRollForward
                            | LocalChainSyncRollBackward,
                            LocalChainSyncError | Schema.SchemaError
                        >();

                        yield* incoming.pipe(
                            Stream.filter((msg) =>
                                msg._tag !==
                                    Schemas.LocalChainSyncMessageType.AwaitReply
                            ),
                            Stream.take(1),
                            Stream.runForEach((msg) => {
                                if (
                                    msg._tag ===
                                        Schemas.LocalChainSyncMessageType
                                            .RollForward ||
                                    msg._tag ===
                                        Schemas.LocalChainSyncMessageType
                                            .RollBackward
                                ) {
                                    return Deferred.succeed(response, msg);
                                }
                                return Deferred.fail(
                                    response,
                                    new LocalChainSyncError({
                                        cause:
                                            `Unexpected message: ${msg._tag}`,
                                    }),
                                );
                            }),
                            Effect.forkChild,
                        );

                        yield* sendMessage({
                            _tag: Schemas.LocalChainSyncMessageType.RequestNext,
                        });

                        return yield* Deferred.await(response).pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );
                    },
                ),
                findIntersect: Effect.fn("LocalChainSyncClient.findIntersect")(
                    function* (points: ReadonlyArray<ChainPoint>) {
                        yield* sendMessage({
                            _tag:
                                Schemas.LocalChainSyncMessageType.FindIntersect,
                            points: [...points],
                        });

                        return yield* incoming.pipe(
                            Stream.take(1),
                            Stream.mapEffect((msg) => {
                                if (
                                    msg._tag ===
                                        Schemas.LocalChainSyncMessageType
                                            .IntersectFound ||
                                    msg._tag ===
                                        Schemas.LocalChainSyncMessageType
                                            .IntersectNotFound
                                ) {
                                    return Effect.succeed(msg);
                                }
                                return Effect.fail(
                                    new LocalChainSyncError({
                                        cause:
                                            `Unexpected message: ${msg._tag}`,
                                    }),
                                );
                            }),
                            Stream.runHead,
                            Effect.flatMap(
                                Option.match({
                                    onNone: () =>
                                        Effect.fail(
                                            new LocalChainSyncError({
                                                cause: "No response",
                                            }),
                                        ),
                                    onSome: Effect.succeed,
                                }),
                            ),
                            Effect.timeout(Duration.seconds(10)),
                        );
                    },
                ),
                done: Effect.fn("LocalChainSyncClient.done")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.LocalChainSyncMessageType.Done,
                        });
                    },
                ),
            });
        }),
    );
}
