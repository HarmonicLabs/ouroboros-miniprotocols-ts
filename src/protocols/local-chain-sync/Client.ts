import {
    Cause,
    Duration,
    Effect,
    Layer,
    Queue,
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

            const inbox = yield* Queue.unbounded<Schemas.LocalChainSyncMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.LocalChainSyncMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            // Skip AwaitReply messages and return the next substantive response
            const receiveNonAwait = Effect.gen(function* () {
                let msg = yield* receiveOne;
                while (msg._tag === Schemas.LocalChainSyncMessageType.AwaitReply) {
                    msg = yield* receiveOne;
                }
                return msg;
            });

            return LocalChainSyncClient.of({
                requestNext: Effect.fn("LocalChainSyncClient.requestNext")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.LocalChainSyncMessageType.RequestNext,
                        });

                        const msg = yield* receiveNonAwait.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            msg._tag ===
                                Schemas.LocalChainSyncMessageType
                                    .RollForward ||
                            msg._tag ===
                                Schemas.LocalChainSyncMessageType
                                    .RollBackward
                        ) {
                            return msg;
                        }

                        return yield* Effect.fail(
                            new LocalChainSyncError({
                                cause: `Unexpected message: ${msg._tag}`,
                            }),
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

                        const msg = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            msg._tag ===
                                Schemas.LocalChainSyncMessageType
                                    .IntersectFound ||
                            msg._tag ===
                                Schemas.LocalChainSyncMessageType
                                    .IntersectNotFound
                        ) {
                            return msg;
                        }

                        return yield* Effect.fail(
                            new LocalChainSyncError({
                                cause: `Unexpected message: ${msg._tag}`,
                            }),
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
