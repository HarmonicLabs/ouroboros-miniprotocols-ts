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
import * as Schemas from "./Schemas";

export class LocalTxSubmitError
    extends Schema.TaggedErrorClass<LocalTxSubmitError>()(
        "LocalTxSubmitError",
        {
            cause: Schema.Defect,
        },
    ) {}

const decodeMessage = Schema.decodeUnknownEffect(
    Schemas.LocalTxSubmitMessageBytes,
);
const encodeMessage = Schema.encodeUnknownEffect(
    Schemas.LocalTxSubmitMessageBytes,
);

export class LocalTxSubmitClient
    extends ServiceMap.Service<LocalTxSubmitClient, {
        submit: (tx: Uint8Array) => Effect.Effect<
            Schemas.LocalTxSubmitResult,
            | LocalTxSubmitError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError
            | Cause.TimeoutError,
            Scope.Scope
        >;
        done: () => Effect.Effect<
            void,
            | LocalTxSubmitError
            | MultiplexerEncodingError
            | Socket.SocketError
            | Schema.SchemaError,
            Scope.Scope
        >;
    }>()("@harmoniclabs/ouroboros-miniprotocols-ts/LocalTxSubmitClient") {
    static readonly layer = Layer.effect(
        LocalTxSubmitClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.LocalTxSubmission,
            ).pipe(
                Effect.mapError((cause) => new LocalTxSubmitError({ cause })),
            );

            const inbox = yield* Queue.unbounded<Schemas.LocalTxSubmitMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.LocalTxSubmitMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            return LocalTxSubmitClient.of({
                submit: Effect.fn("LocalTxSubmitClient.submit")(
                    function* (tx: Uint8Array) {
                        yield* sendMessage({
                            _tag: Schemas.LocalTxSubmitMessageType.SubmitTx,
                            tx,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(10)),
                        );

                        if (
                            response._tag ===
                                Schemas.LocalTxSubmitMessageType.AcceptTx
                        ) {
                            return { accepted: true as const };
                        }

                        if (
                            response._tag ===
                                Schemas.LocalTxSubmitMessageType.RejectTx
                        ) {
                            return {
                                accepted: false as const,
                                reason: response.reason,
                            };
                        }

                        return yield* Effect.fail(
                            new LocalTxSubmitError({
                                cause: `Unexpected message: ${response._tag}`,
                            }),
                        );
                    },
                ),
                done: Effect.fn("LocalTxSubmitClient.done")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.LocalTxSubmitMessageType.Done,
                        });
                    },
                ),
            });
        }),
    );
}
