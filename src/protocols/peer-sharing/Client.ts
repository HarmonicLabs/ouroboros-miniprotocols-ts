import {
    Cause,
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

            const incoming = channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
            );

            const sendMessage = (msg: Schemas.PeerSharingMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = incoming.pipe(
                Stream.take(1),
                Stream.runHead,
                Effect.flatMap(
                    Option.match({
                        onNone: () =>
                            Effect.fail(
                                new PeerSharingError({ cause: "No response" }),
                            ),
                        onSome: Effect.succeed,
                    }),
                ),
            );

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
