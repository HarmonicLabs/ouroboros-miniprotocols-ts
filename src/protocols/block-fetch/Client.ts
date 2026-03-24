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
import { ChainPoint } from "../types/ChainPoint";
import * as Schemas from "./Schemas";

export class BlockFetchError extends Schema.TaggedErrorClass<BlockFetchError>()("BlockFetchError", {
  cause: Schema.Defect,
}) {}

const decodeMessage = Schema.decodeUnknownEffect(Schemas.BlockFetchMessageBytes);
const encodeMessage = Schema.encodeUnknownEffect(Schemas.BlockFetchMessageBytes);

export class BlockFetchClient extends ServiceMap.Service<BlockFetchClient, {
  requestRange: (from: ChainPoint, to: ChainPoint) => Effect.Effect<
    Option.Option<Stream.Stream<Uint8Array, BlockFetchError | Schema.SchemaError, Scope.Scope>>,
    BlockFetchError | MultiplexerEncodingError | Socket.SocketError | Schema.SchemaError | Cause.TimeoutError,
    Scope.Scope
  >;
  done: () => Effect.Effect<
    void,
    BlockFetchError | MultiplexerEncodingError | Socket.SocketError | Schema.SchemaError,
    Scope.Scope
  >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/BlockFetchClient") {
  static readonly layer = Layer.effect(
    BlockFetchClient,
    Effect.gen(function* () {
      const multiplexer = yield* Multiplexer;
      const channel = yield* multiplexer.getProtocolChannel(MiniProtocol.BlockFetch).pipe(
        Effect.mapError((cause) => new BlockFetchError({ cause })),
      );

      const incoming = channel.incoming.pipe(
        Stream.mapEffect((bytes) => decodeMessage(bytes))
      );

      const sendMessage = (msg: Schemas.BlockFetchMessageT) =>
        encodeMessage(msg).pipe(Effect.flatMap(channel.send));

      return BlockFetchClient.of({
        requestRange: Effect.fn("BlockFetchClient.requestRange")(
          function* (from: ChainPoint, to: ChainPoint) {
            yield* sendMessage({
              _tag: Schemas.BlockFetchMessageType.RequestRange,
              from,
              to,
            });

            // Wait for StartBatch or NoBlocks
            const firstMsg = yield* incoming.pipe(
              Stream.take(1),
              Stream.runHead,
              Effect.flatMap(
                Option.match({
                  onNone: () => Effect.fail(new BlockFetchError({ cause: "No response" })),
                  onSome: Effect.succeed
                })
              ),
              Effect.timeout(Duration.seconds(60)),
            );

            if (firstMsg._tag === Schemas.BlockFetchMessageType.NoBlocks) {
              return Option.none();
            }

            if (firstMsg._tag !== Schemas.BlockFetchMessageType.StartBatch) {
              return yield* Effect.fail(
                new BlockFetchError({ cause: `Unexpected message: ${firstMsg._tag}` }),
              );
            }

            // Return a stream of blocks until BatchDone
            const blockStream = incoming.pipe(
              Stream.takeWhile((msg) => msg._tag !== Schemas.BlockFetchMessageType.BatchDone),
              Stream.mapEffect((msg) =>
                msg._tag === Schemas.BlockFetchMessageType.Block
                  ? Effect.succeed(msg.block)
                  : Effect.fail(new BlockFetchError({ cause: `Unexpected message in batch: ${msg._tag}` }))
              ),
            );

            return Option.some(blockStream);
          },
        ),
        done: Effect.fn("BlockFetchClient.done")(
          function* () {
            yield* sendMessage({ _tag: Schemas.BlockFetchMessageType.ClientDone });
          },
        ),
      });
    }),
  );
}
