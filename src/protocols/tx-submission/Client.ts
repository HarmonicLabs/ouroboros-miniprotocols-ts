import { Effect, Layer, Queue, Schema, Scope, ServiceMap, Stream } from "effect";
import { Socket } from "effect/unstable/socket";

import { Multiplexer } from "../../multiplexer/Multiplexer";
import { MultiplexerEncodingError } from "../../multiplexer/Errors";
import { MiniProtocol } from "../../MiniProtocol";
import * as Schemas from "./Schemas";

export class TxSubmissionError
    extends Schema.TaggedErrorClass<TxSubmissionError>()("TxSubmissionError", {
        cause: Schema.Defect,
    }) {}

export interface TxSubmissionHandlers {
    readonly onRequestTxIds: (
        ack: number,
        req: number,
        blocking: boolean,
    ) => Effect.Effect<
        ReadonlyArray<Schemas.TxIdAndSize>
    >;
    readonly onRequestTxs: (txIds: ReadonlyArray<Uint8Array>) => Effect.Effect<
        ReadonlyArray<Uint8Array>
    >;
}

const decodeMessage = Schema.decodeUnknownEffect(
    Schemas.TxSubmissionMessageBytes,
);
const encodeMessage = Schema.encodeUnknownEffect(
    Schemas.TxSubmissionMessageBytes,
);

export class TxSubmissionClient extends ServiceMap.Service<TxSubmissionClient, {
    run: (handlers: TxSubmissionHandlers) => Effect.Effect<
        void,
        | TxSubmissionError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError,
        Scope.Scope
    >;
    done: () => Effect.Effect<
        void,
        | TxSubmissionError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/TxSubmissionClient") {
    static readonly layer = Layer.effect(
        TxSubmissionClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.TxSubmission,
            ).pipe(
                Effect.mapError((cause) => new TxSubmissionError({ cause })),
            );

            const inbox = yield* Queue.unbounded<Schemas.TxSubmissionMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.TxSubmissionMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            return TxSubmissionClient.of({
                run: Effect.fn("TxSubmissionClient.run")(
                    function* (handlers: TxSubmissionHandlers) {
                        // Send Init message to start the protocol
                        yield* sendMessage({
                            _tag: Schemas.TxSubmissionMessageType.Init,
                        });

                        // Enter the server-driven event loop
                        yield* Effect.gen(function* () {
                            const msg = yield* Queue.take(inbox);

                            if (
                                msg._tag ===
                                    Schemas.TxSubmissionMessageType
                                        .RequestTxIds
                            ) {
                                const ids = yield* handlers
                                    .onRequestTxIds(
                                        msg.ack,
                                        msg.req,
                                        msg.blocking,
                                    );
                                yield* sendMessage({
                                    _tag:
                                        Schemas.TxSubmissionMessageType
                                            .ReplyTxIds,
                                    ids: [...ids],
                                });
                            } else if (
                                msg._tag ===
                                    Schemas.TxSubmissionMessageType
                                        .RequestTxs
                            ) {
                                const txs = yield* handlers
                                    .onRequestTxs(msg.txIds);
                                yield* sendMessage({
                                    _tag:
                                        Schemas.TxSubmissionMessageType
                                            .ReplyTxs,
                                    txs: [...txs],
                                });
                            } else if (
                                msg._tag ===
                                    Schemas.TxSubmissionMessageType.Done
                            ) {
                                // Protocol done
                            } else {
                                yield* Effect.fail(
                                    new TxSubmissionError({
                                        cause:
                                            `Unexpected server message: ${msg._tag}`,
                                    }),
                                );
                            }
                        }).pipe(Effect.forever);
                    },
                ),
                done: Effect.fn("TxSubmissionClient.done")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.TxSubmissionMessageType.Done,
                        });
                    },
                ),
            });
        }),
    );
}
