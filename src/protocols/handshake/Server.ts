import {
  Effect,
  Layer,
  Schema,
  Scope,
  ServiceMap,
  Stream,
} from "effect";
import { Socket } from "effect/unstable/socket";

import _ from "lodash";

import { Multiplexer } from "../../multiplexer/Multiplexer";
import { CborCodec } from "../../services/CborCodec";
import { MiniProtocol } from "../../MiniProtocol";
import * as Schemas from "./Schemas";
import { MultiplexerError } from "@/multiplexer";

/**
 * Handshake server configuration
 */
export interface HandshakeServerConfig {
  supportedVersions: Schema.Schema.Type<typeof Schemas.VersionTableSchema>;
}

/**
 * Handshake server errors
 */
export class HandshakeServerError extends Schema.ErrorClass<HandshakeServerError>("HandshakeServerError")({
  cause: Schema.Defect,
}) {}

/**
 * Effect-TS Handshake server service
 */
export class HandshakeServer extends ServiceMap.Service<HandshakeServer, {
  /**
   * Start the handshake server to listen for proposals
   */
  start: () => Effect.Effect<
    void,
    HandshakeServerError | MultiplexerError | Socket.SocketError | Schema.SchemaError,
    Scope.Scope
  >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/HandshakeServer") {
  static readonly layer = (config: HandshakeServerConfig) =>
    Layer.effect(
      HandshakeServer,
      Effect.gen(function* () {
        const multiplexer = yield* Multiplexer;
        const cborCodec = yield* CborCodec;

        return HandshakeServer.of({
          start: Effect.fn("HandshakeServer.start")(
            function* () {
              // Get the handshake protocol channel
              const channel = yield* multiplexer.getProtocolChannel(MiniProtocol.Handshake);

              // Process incoming messages
              yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) =>
                  cborCodec.decodeValid(bytes, Schemas.HandshakeMessageFromCbor)
                ),
                Stream.mapEffect((message) =>
                  message._tag === Schemas.HandshakeMessageType.MsgProposeVersions ?
                    Effect.gen(function*() {
                      const proposedVersions = Schema.decodeSync(
                        Schema.String.pipe(
                          Schema.decodeTo(Schemas.VersionNumber),
                          Schema.Array
                        )
                      )(Object.keys(message.versionTable.data));

                      const supportedVersions = Schema.decodeSync(
                        Schema.String.pipe(
                          Schema.decodeTo(Schemas.VersionNumber),
                          Schema.Array
                        )
                      )(Object.keys(config.supportedVersions.data));

                      const intersection = _.intersection(proposedVersions, supportedVersions);
                      const selectedVersion = _.max(intersection)

                      if (selectedVersion) {
                        const proposedData = message.versionTable.data[selectedVersion];

                        if (proposedData?.query) {                        
                          const queryReplyMessage = {
                            _tag: Schemas.HandshakeMessageType.MsgQueryReply,
                            versionTable: config.supportedVersions,
                          };

                          const bytes = yield* cborCodec.encodeValid(queryReplyMessage, Schemas.HandshakeMessageFromCbor);

                          yield* channel.send(bytes);
                        } else {
                          const acceptedData = config.supportedVersions.data[selectedVersion];

                          if (!acceptedData) {
                            return yield* Effect.fail(new HandshakeServerError({ cause: "Internal error: version not found" }));
                          }

                          const acceptMessage = {
                            _tag: Schemas.HandshakeMessageType.MsgAcceptVersion,
                            version: selectedVersion,
                            versionData: acceptedData,
                          };

                          yield* cborCodec.encodeValid(acceptMessage, Schemas.HandshakeMessageFromCbor).pipe(
                            Effect.flatMap(channel.send)
                          );
                        }
                      } else {
                        const refuseMessage = {
                          _tag: Schemas.HandshakeMessageType.MsgRefuse,
                          reason: {
                            _tag: Schemas.RefuseReasonType.VersionMismatch,
                            validVersions: supportedVersions,
                          },
                        };
                        yield* cborCodec.encodeValid(refuseMessage, Schemas.HandshakeMessageFromCbor).pipe(
                          Effect.flatMap(channel.send),
                        );
                      }
                    }) :
                    Effect.fail(new HandshakeServerError({ cause: new Error(`Message doesn't have correct tag: ${message}`) }))
                ),
                Stream.runDrain,
              );
            },
          ),
        });
      }),
    );
}
