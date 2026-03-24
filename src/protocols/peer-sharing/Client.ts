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

export class PeerSharingError
    extends Schema.TaggedErrorClass<PeerSharingError>()("PeerSharingError", {
        cause: Schema.Defect,
    }) {}

const decodeMessage = Schema.decodeUnknownEffect(
    Schemas.PeerSharingMessageBytes,
);
const encodeMessage = Schema.encodeUnknownEffect(
    Schemas.PeerSharingMessageBytes,
);

export class PeerSharingClient extends ServiceMap.Service<PeerSharingClient, {
    shareRequest: (amount: number) => Effect.Effect<
        ReadonlyArray<Schemas.PeerAddress>,
        | PeerSharingError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError
        | Cause.TimeoutError,
        Scope.Scope
    >;
    done: () => Effect.Effect<
        void,
        | PeerSharingError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/PeerSharingClient") {
    static readonly layer = Layer.effect(
        PeerSharingClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.PeerSharing,
            ).pipe(
                Effect.mapError((cause) => new PeerSharingError({ cause })),
            );

            const inbox = yield* Queue.unbounded<Schemas.PeerSharingMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.PeerSharingMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            return PeerSharingClient.of({
                shareRequest: Effect.fn("PeerSharingClient.shareRequest")(
                    function* (amount: number) {
                        yield* sendMessage({
                            _tag: Schemas.PeerSharingMessageType.ShareRequest,
                            amount,
                        });

                        const response = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(60)),
                        );

                        if (
                            response._tag !==
                                Schemas.PeerSharingMessageType.SharePeers
                        ) {
                            return yield* Effect.fail(
                                new PeerSharingError({
                                    cause:
                                        `Unexpected message: ${response._tag}`,
                                }),
                            );
                        }

                        return response.peers;
                    },
                ),
                done: Effect.fn("PeerSharingClient.done")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.PeerSharingMessageType.Done,
                        });
                    },
                ),
            });
        }),
    );
}
