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

export class ChainSyncError
    extends Schema.TaggedErrorClass<ChainSyncError>()("ChainSyncError", {
        cause: Schema.Defect,
    }) {}

export type ChainSyncRollForward =
    & Schema.Schema.Type<typeof Schemas.ChainSyncMessage>
    & { readonly _tag: Schemas.ChainSyncMessageType.RollForward };
export type ChainSyncRollBackward =
    & Schema.Schema.Type<typeof Schemas.ChainSyncMessage>
    & { readonly _tag: Schemas.ChainSyncMessageType.RollBackward };
export type ChainSyncIntersectFound =
    & Schema.Schema.Type<typeof Schemas.ChainSyncMessage>
    & { readonly _tag: Schemas.ChainSyncMessageType.IntersectFound };
export type ChainSyncIntersectNotFound =
    & Schema.Schema.Type<typeof Schemas.ChainSyncMessage>
    & { readonly _tag: Schemas.ChainSyncMessageType.IntersectNotFound };

const decodeMessage = Schema.decodeUnknownEffect(Schemas.ChainSyncMessageBytes);
const encodeMessage = Schema.encodeUnknownEffect(Schemas.ChainSyncMessageBytes);

export class ChainSyncClient extends ServiceMap.Service<ChainSyncClient, {
    requestNext: () => Effect.Effect<
        ChainSyncRollForward | ChainSyncRollBackward,
        | ChainSyncError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError
        | Cause.TimeoutError,
        Scope.Scope
    >;
    findIntersect: (points: ReadonlyArray<ChainPoint>) => Effect.Effect<
        ChainSyncIntersectFound | ChainSyncIntersectNotFound,
        | ChainSyncError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError
        | Cause.TimeoutError,
        Scope.Scope
    >;
    done: () => Effect.Effect<
        void,
        | ChainSyncError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/ChainSyncClient") {
    static readonly layer = Layer.effect(
        ChainSyncClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.ChainSync,
            ).pipe(
                Effect.mapError((cause) => new ChainSyncError({ cause })),
            );

            const inbox = yield* Queue.unbounded<Schemas.ChainSyncMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.ChainSyncMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            // Skip AwaitReply messages and return the next substantive response
            const receiveNonAwait = Effect.gen(function* () {
                let msg = yield* receiveOne;
                while (msg._tag === Schemas.ChainSyncMessageType.AwaitReply) {
                    msg = yield* receiveOne;
                }
                return msg;
            });

            return ChainSyncClient.of({
                requestNext: Effect.fn("ChainSyncClient.requestNext")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.ChainSyncMessageType.RequestNext,
                        });

                        const msg = yield* receiveNonAwait.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            msg._tag ===
                                Schemas.ChainSyncMessageType.RollForward ||
                            msg._tag ===
                                Schemas.ChainSyncMessageType.RollBackward
                        ) {
                            return msg;
                        }

                        return yield* Effect.fail(
                            new ChainSyncError({
                                cause: `Unexpected message: ${msg._tag}`,
                            }),
                        );
                    },
                ),
                findIntersect: Effect.fn("ChainSyncClient.findIntersect")(
                    function* (points: ReadonlyArray<ChainPoint>) {
                        yield* sendMessage({
                            _tag: Schemas.ChainSyncMessageType.FindIntersect,
                            points: [...points],
                        });

                        const msg = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            msg._tag ===
                                Schemas.ChainSyncMessageType.IntersectFound ||
                            msg._tag ===
                                Schemas.ChainSyncMessageType.IntersectNotFound
                        ) {
                            return msg;
                        }

                        return yield* Effect.fail(
                            new ChainSyncError({
                                cause: `Unexpected message: ${msg._tag}`,
                            }),
                        );
                    },
                ),
                done: Effect.fn("ChainSyncClient.done")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.ChainSyncMessageType.Done,
                        });
                    },
                ),
            });
        }),
    );
}
