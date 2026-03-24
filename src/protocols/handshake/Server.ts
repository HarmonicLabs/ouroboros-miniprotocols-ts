import { Effect, Layer, Schema, Scope, ServiceMap, Stream } from "effect";
import { Socket } from "effect/unstable/socket";

import _ from "lodash";

import { Multiplexer } from "../../multiplexer/Multiplexer";
import { MultiplexerEncodingError } from "../../multiplexer/Errors";
import { MultiplexerHeaderError } from "@/multiplexer";
import { MiniProtocol } from "../../MiniProtocol";
import * as Schemas from "./Schemas";

/**
 * Handshake server configuration
 */
export interface HandshakeServerConfig {
    supportedVersions: Schemas.VersionTable;
}

/**
 * Handshake server errors
 */
export class HandshakeServerError
    extends Schema.TaggedErrorClass<HandshakeServerError>()(
        "HandshakeServerError",
        {
            cause: Schema.Defect,
        },
    ) {}

const decodeMessage = Schema.decodeUnknownEffect(Schemas.HandshakeMessageBytes);
const encodeMessage = Schema.encodeUnknownEffect(Schemas.HandshakeMessageBytes);

/**
 * Handles a single handshake proposal message from a client.
 */
const handleProposal = (
    message: Schemas.HandshakeMessageT,
    config: HandshakeServerConfig,
    channel: {
        send: (
            data: Uint8Array,
        ) => Effect.Effect<
            void,
            MultiplexerEncodingError | Socket.SocketError,
            Scope.Scope
        >;
    },
) => message._tag === Schemas.HandshakeMessageType.MsgProposeVersions
    ? Effect.gen(function* () {
        const proposedVersions = Schema.decodeSync(
            Schema.String.pipe(
                Schema.decodeTo(Schemas.VersionNumber),
                Schema.Array,
            ),
        )(Object.keys(message.versionTable.data));

        const supportedVersions = Schema.decodeSync(
            Schema.String.pipe(
                Schema.decodeTo(Schemas.VersionNumber),
                Schema.Array,
            ),
        )(Object.keys(config.supportedVersions.data));

        const intersection = _.intersection(
            proposedVersions,
            supportedVersions,
        );
        const selectedVersion = _.max(intersection);

        if (selectedVersion) {
            const proposedData = message.versionTable.data[selectedVersion];

            if (proposedData?.query) {
                yield* encodeMessage({
                    _tag: Schemas.HandshakeMessageType.MsgQueryReply,
                    versionTable: config.supportedVersions,
                }).pipe(Effect.flatMap(channel.send));
            } else {
                const acceptedData =
                    config.supportedVersions.data[selectedVersion];

                if (!acceptedData) {
                    return yield* Effect.fail(
                        new HandshakeServerError({
                            cause: "Internal error: version not found",
                        }),
                    );
                }

                yield* encodeMessage({
                    _tag: Schemas.HandshakeMessageType.MsgAcceptVersion,
                    version: selectedVersion,
                    versionData: acceptedData,
                }).pipe(Effect.flatMap(channel.send));
            }
        } else {
            yield* encodeMessage({
                _tag: Schemas.HandshakeMessageType.MsgRefuse,
                reason: {
                    _tag: Schemas.RefuseReasonType.VersionMismatch,
                    validVersions: supportedVersions,
                },
            }).pipe(Effect.flatMap(channel.send));
        }
    })
    : Effect.fail(
        new HandshakeServerError({
            cause: new Error(`Message doesn't have correct tag: ${message}`),
        }),
    );

/**
 * Effect-TS Handshake server service
 */
export class HandshakeServer extends ServiceMap.Service<HandshakeServer, {
    start: () => Effect.Effect<
        void,
        | HandshakeServerError
        | MultiplexerHeaderError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/HandshakeServer") {
    static readonly layer = (config: HandshakeServerConfig) =>
        Layer.effect(
            HandshakeServer,
            Effect.gen(function* () {
                const multiplexer = yield* Multiplexer;

                return HandshakeServer.of({
                    start: Effect.fn("HandshakeServer.start")(
                        function* () {
                            const channel = yield* multiplexer
                                .getProtocolChannel(
                                    MiniProtocol.Handshake,
                                );

                            yield* channel.incoming.pipe(
                                Stream.mapEffect((bytes) =>
                                    decodeMessage(bytes)
                                ),
                                Stream.mapEffect((message) =>
                                    handleProposal(message, config, channel)
                                ),
                                Stream.runDrain,
                            );
                        },
                    ),
                });
            }),
        );
}
