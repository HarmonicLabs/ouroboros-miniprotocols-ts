import {
  Cause,
  Deferred,
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
import { ChainPoint } from "../types/ChainPoint";
import * as Schemas from "./Schemas";

export class ChainSyncError extends Schema.TaggedErrorClass<ChainSyncError>()("ChainSyncError", {
  cause: Schema.Defect,
}) {}

export type ChainSyncRollForward = Schema.Schema.Type<typeof Schemas.ChainSyncMessage> & {
  readonly _tag: Schemas.ChainSyncMessageType.RollForward;
};
export type ChainSyncRollBackward = Schema.Schema.Type<typeof Schemas.ChainSyncMessage> & {
  readonly _tag: Schemas.ChainSyncMessageType.RollBackward;
};
export type ChainSyncIntersectFound = Schema.Schema.Type<typeof Schemas.ChainSyncMessage> & {
  readonly _tag: Schemas.ChainSyncMessageType.IntersectFound;
};
export type ChainSyncIntersectNotFound = Schema.Schema.Type<typeof Schemas.ChainSyncMessage> & {
  readonly _tag: Schemas.ChainSyncMessageType.IntersectNotFound;
};

const decodeMessage = Schema.decodeUnknownEffect(Schemas.ChainSyncMessageBytes);
const encodeMessage = Schema.encodeUnknownEffect(Schemas.ChainSyncMessageBytes);

export class ChainSyncClient extends ServiceMap.Service<ChainSyncClient, {
  requestNext: () => Effect.Effect<
    ChainSyncRollForward | ChainSyncRollBackward,
    ChainSyncError | MultiplexerEncodingError | Socket.SocketError | Schema.SchemaError | Cause.TimeoutError,
    Scope.Scope
  >;
  findIntersect: (points: ReadonlyArray<ChainPoint>) => Effect.Effect<
    ChainSyncIntersectFound | ChainSyncIntersectNotFound,
    ChainSyncError | MultiplexerEncodingError | Socket.SocketError | Schema.SchemaError | Cause.TimeoutError,
    Scope.Scope
  >;
  done: () => Effect.Effect<
    void,
    ChainSyncError | MultiplexerEncodingError | Socket.SocketError | Schema.SchemaError,
    Scope.Scope
  >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/ChainSyncClient") {
  static readonly layer = Layer.effect(
    ChainSyncClient,
    Effect.gen(function* () {
      const multiplexer = yield* Multiplexer;
      const channel = yield* multiplexer.getProtocolChannel(MiniProtocol.ChainSync).pipe(
        Effect.mapError((cause) => new ChainSyncError({ cause })),
      );

      const incoming = channel.incoming.pipe(
        Stream.mapEffect((bytes) => decodeMessage(bytes))
      );

      const sendMessage = (msg: Schemas.ChainSyncMessageT) =>
        encodeMessage(msg).pipe(Effect.flatMap(channel.send));

      return ChainSyncClient.of({
        requestNext: Effect.fn("ChainSyncClient.requestNext")(
          function* () {
            const response = yield* Deferred.make<
              ChainSyncRollForward | ChainSyncRollBackward,
              ChainSyncError | Schema.SchemaError
            >();

            // Fork a fiber to listen for the non-AwaitReply response
            yield* incoming.pipe(
              Stream.filter((msg) => msg._tag !== Schemas.ChainSyncMessageType.AwaitReply),
              Stream.take(1),
              Stream.runForEach((msg) => {
                if (
                  msg._tag === Schemas.ChainSyncMessageType.RollForward ||
                  msg._tag === Schemas.ChainSyncMessageType.RollBackward
                ) {
                  return Deferred.succeed(response, msg);
                }
                return Deferred.fail(
                  response,
                  new ChainSyncError({ cause: `Unexpected message: ${msg._tag}` }),
                );
              }),
              Effect.forkChild,
            );

            yield* sendMessage({ _tag: Schemas.ChainSyncMessageType.RequestNext });

            return yield* Deferred.await(response).pipe(
              Effect.timeout(Duration.seconds(10)),
            );
          },
        ),
        findIntersect: Effect.fn("ChainSyncClient.findIntersect")(
          function* (points: ReadonlyArray<ChainPoint>) {
            yield* sendMessage({
              _tag: Schemas.ChainSyncMessageType.FindIntersect,
              points: [...points],
            });

            return yield* incoming.pipe(
              Stream.take(1),
              Stream.mapEffect((msg) => {
                if (
                  msg._tag === Schemas.ChainSyncMessageType.IntersectFound ||
                  msg._tag === Schemas.ChainSyncMessageType.IntersectNotFound
                ) {
                  return Effect.succeed(msg);
                }
                return Effect.fail(
                  new ChainSyncError({ cause: `Unexpected message: ${msg._tag}` }),
                );
              }),
              Stream.runHead,
              Effect.flatMap(
                Option.match({
                  onNone: () => Effect.fail(new ChainSyncError({ cause: "No response" })),
                  onSome: Effect.succeed
                })
              ),
              Effect.timeout(Duration.seconds(10)),
            );
          },
        ),
        done: Effect.fn("ChainSyncClient.done")(
          function* () {
            yield* sendMessage({ _tag: Schemas.ChainSyncMessageType.Done });
          },
        ),
      });
    }),
  );
}
