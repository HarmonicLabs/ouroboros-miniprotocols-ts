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

/**
 * Handshake errors
 */
export class HandshakeError
    extends Schema.TaggedErrorClass<HandshakeError>()("HandshakeError", {
        cause: Schema.Defect,
    }) {}

export class HandshakeTimeoutError
    extends Schema.TaggedErrorClass<HandshakeTimeoutError>()(
        "HandshakeTimeoutError",
        {
            cause: Schema.Defect,
        },
    ) {}

/**
 * Effect-TS Handshake client service
 */
export class HandshakeClient extends ServiceMap.Service<HandshakeClient, {
    propose: (
        versionTable: Schemas.VersionTable,
    ) => Effect.Effect<
        Schemas.HandshakeMessageT,
        | HandshakeError
        | HandshakeTimeoutError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError
        | Cause.TimeoutError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/HandshakeClient") {
    static readonly layer = Layer.effect(
        HandshakeClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;

            return HandshakeClient.of({
                propose: Effect.fn("HandshakeClient.propose")(
                    function* (versionTable: Schemas.VersionTable) {
                        const channel = yield* multiplexer.getProtocolChannel(
                            MiniProtocol.Handshake,
                        ).pipe(
                            Effect.mapError((cause) =>
                                new HandshakeError({ cause })
                            ),
                        );

                        const proposeMessage = {
                            _tag:
                                Schemas.HandshakeMessageType.MsgProposeVersions,
                            versionTable,
                        };

                        const bytes = yield* Schema.encodeUnknownEffect(
                            Schemas.HandshakeMessageBytes,
                        )(proposeMessage);

                        yield* channel.send(bytes);

                        return yield* channel.incoming.pipe(
                            Stream.take(1),
                            Stream.mapEffect((bytes) =>
                                Schema.decodeUnknownEffect(
                                    Schemas.HandshakeMessageBytes,
                                )(bytes)
                            ),
                            Stream.runHead,
                            Effect.flatMap(
                                Option.match({
                                    onNone: () =>
                                        Effect.fail(
                                            new HandshakeError({
                                                cause: "No response received",
                                            }),
                                        ),
                                    onSome: Effect.succeed,
                                }),
                            ),
                            Effect.timeout(Duration.seconds(10)),
                        );
                    },
                ),
            });
        }),
    );
}
