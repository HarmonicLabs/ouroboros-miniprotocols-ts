import {
    Cause,
    Duration,
    Effect,
    Layer,
    Queue,
    Schedule,
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

export class KeepAliveError
    extends Schema.TaggedErrorClass<KeepAliveError>()("KeepAliveError", {
        cause: Schema.Defect,
    }) {}

const decodeMessage = Schema.decodeUnknownEffect(Schemas.KeepAliveMessageBytes);
const encodeMessage = Schema.encodeUnknownEffect(Schemas.KeepAliveMessageBytes);

export class KeepAliveClient extends ServiceMap.Service<KeepAliveClient, {
    keepAlive: (cookie: number) => Effect.Effect<
        number,
        | KeepAliveError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError
        | Cause.TimeoutError,
        Scope.Scope
    >;
    done: () => Effect.Effect<
        void,
        | KeepAliveError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError,
        Scope.Scope
    >;
    run: () => Effect.Effect<
        void,
        | KeepAliveError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError
        | Cause.TimeoutError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/KeepAliveClient") {
    static readonly layer = Layer.effect(
        KeepAliveClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.KeepAlive,
            ).pipe(
                Effect.mapError((cause) => new KeepAliveError({ cause })),
            );

            const inbox = yield* Queue.unbounded<Schemas.KeepAliveMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.KeepAliveMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            return KeepAliveClient.of({
                keepAlive: Effect.fn("KeepAliveClient.keepAlive")(
                    function* (cookie: number) {
                        yield* sendMessage({
                            _tag: Schemas.KeepAliveMessageType.KeepAlive,
                            cookie,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(97)),
                        );

                        if (
                            response._tag !==
                                Schemas.KeepAliveMessageType.KeepAliveResponse
                        ) {
                            return yield* Effect.fail(
                                new KeepAliveError({
                                    cause:
                                        `Unexpected message: ${response._tag}`,
                                }),
                            );
                        }

                        return response.cookie;
                    },
                ),
                done: Effect.fn("KeepAliveClient.done")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.KeepAliveMessageType.Done,
                        });
                    },
                ),
                run: Effect.fn("KeepAliveClient.run")(
                    function* () {
                        let cookie = 0;
                        return yield* sendMessage({
                            _tag: Schemas.KeepAliveMessageType.KeepAlive,
                            cookie: cookie++,
                        }).pipe(
                            Effect.andThen(() => receiveOne),
                            Effect.repeat(
                                Schedule.spaced(Duration.seconds(30)),
                            ),
                        );
                    },
                ),
            });
        }),
    );
}
