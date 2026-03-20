import {
  Cause,
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
import { CborCodec, CborCodecError } from "../../services/CborCodec";
import { MiniProtocol } from "../../MiniProtocol";
import * as Schemas from "./Schemas";

/**
 * Type aliases derived from Effect-TS schemas
 */
export type NodeToNodeVersionData = Schema.Schema.Type<typeof Schemas.NodeToNodeVersionDataSchema>;
export type NodeToClientVersionData = Schema.Schema.Type<typeof Schemas.NodeToClientVersionDataSchema>;
export type VersionTable = Schema.Schema.Type<typeof Schemas.VersionTableSchema>;
export type RefuseReason = Schema.Schema.Type<typeof Schemas.RefuseReasonSchema>;
export type HandshakeMessage = Schema.Schema.Type<typeof Schemas.HandshakeMessage>;

/**
 * Handshake result types
 */
export type HandshakeResult = Schema.Schema.Type<typeof Schemas.HandshakeMessage>;

/**
 * Handshake errors
 */
export class HandshakeError extends Schema.ErrorClass<HandshakeError>("HandshakeError")({
  cause: Schema.Defect,
}) {}

export class HandshakeTimeoutError extends Schema.ErrorClass<HandshakeTimeoutError>("HandshakeTimeoutError")({
  cause: Schema.Defect,
}) {}

/**
 * Effect-TS Handshake client service
 */
export class HandshakeClient extends ServiceMap.Service<HandshakeClient, {
  /**
   * Propose handshake versions and wait for server response
   */
  propose: (
    versionTable: VersionTable,
  ) => Effect.Effect<
    HandshakeResult,
    HandshakeError | HandshakeTimeoutError | Socket.SocketError | Schema.SchemaError | CborCodecError | Cause.TimeoutError,
    Scope.Scope | Socket.Socket
  >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/HandshakeClient") {
  static readonly layer = Layer.effect(
    HandshakeClient,
    Effect.gen(function* () {
      const multiplexer = yield* Multiplexer;
      const cborCodec = yield* CborCodec;

      return HandshakeClient.of({
        propose: Effect.fn("HandshakeClient.propose")(
          function* (
            versionTable: VersionTable,
          ) {
            // Get the handshake protocol channel
            const channel = yield* multiplexer.getProtocolChannel(MiniProtocol.Handshake).pipe(
              Effect.mapError((cause) => new HandshakeError({ cause })),
            );

            // Create the propose message
            const proposeMessage = {
              _tag: Schemas.HandshakeMessageType.MsgProposeVersions,
              versionTable,
            };

            // Encode to bytes using the FromCbor schema for encoding
            const bytes = yield* cborCodec.encodeValid(proposeMessage, Schemas.HandshakeMessageFromCbor);

            // Send the message
            yield* channel.send(bytes)

            // .pipe(
            //   Effect.mapError((cause) => new HandshakeError({ cause })),
            // );

            // Wait for response
            const responseBytesToResult = channel.incoming.pipe(
              Stream.take(1),
              Stream.runHead,
              Effect.flatMap(
                Option.match({
                  onNone: () =>
                    Effect.fail(new HandshakeError({ cause: "No response received" })),
                  onSome: (responseBytes) =>
                    cborCodec
                      .decodeValid(responseBytes, Schemas.HandshakeMessageFromCbor)
                }),
              ),
            );

            // Apply timeout
            const timed = responseBytesToResult.pipe(
              Effect.timeout("10 seconds"),
            );

            // Map unexpected errors to HandshakeError
            return yield* timed;
          },
        ),
      });
    }),
  );
}
