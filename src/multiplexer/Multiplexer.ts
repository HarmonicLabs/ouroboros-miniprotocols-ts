import { Effect, Layer, ServiceMap, Stream, HashMap, Fiber, Option, PubSub, Scope, Schema, Ref } from "effect"
import * as Socket from "effect/unstable/socket/Socket"

import * as _ from "lodash";

import { MiniProtocol } from "../MiniProtocol"
import { MultiplexerBuffer } from "./Buffer";
import { MultiplexerError, MultiplexerFrameError } from "./Errors"; 

/**
 * Protocol channel for streaming messages
 */
export interface ProtocolChannel {
  readonly protocolId: MiniProtocol
  readonly incoming: Stream.Stream<Uint8Array, never, Scope.Scope>
  readonly send: (data: Uint8Array) => Effect.Effect<void, Socket.SocketError, Scope.Scope>
}

/**
 * Effect-TS Multiplexer service
 */
export class Multiplexer extends ServiceMap.Service<Multiplexer, {
  /**
   * Get a protocol channel for streaming messages
   */
  getProtocolChannel: (protocolId: MiniProtocol) => Effect.Effect<
    ProtocolChannel,
    MultiplexerError | Socket.SocketError | Schema.SchemaError,
    Scope.Scope
  >
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/Multiplexer") {
  static readonly layer = Layer.effect(
    Multiplexer,
    Effect.acquireRelease(
      Effect.gen(function*() {
        const socket = yield* Socket.Socket;
        const channels = HashMap.fromIterable([
          [MiniProtocol.BlockFetch, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.ChainSync, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.Handshake, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.KeepAlive, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalChainSync, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalStateQuery, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalTxMonitor, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalTxSubmission, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.PeerSharing, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.TxSubmission, yield* PubSub.unbounded<Uint8Array>()]
        ]);

        const mb = yield* Ref.make(yield* MultiplexerBuffer);

        const fetchFiber = yield* mb.pipe(
          Ref.get,
          Effect.flatMap(({ appendChunk }) => socket.run(appendChunk)),
          Effect.forever,
          Effect.forkChild
        );

        const processFiber = yield* mb.pipe(
          Ref.get,
          Effect.flatMap(({ processedFrames }) => processedFrames()),
          Effect.flatMap(
            Effect.forEach(
              (frame) => channels.pipe(
                HashMap.get(frame.header.protocol),
                Option.match({
                  onNone: () => Effect.fail(new MultiplexerFrameError({
                    frameType: "UNKNOWN",
                    frameData: frame.payload,
                    cause: new Error(`Invalid frame header: ${frame.header}`),
                  })),
                  onSome: (ps) => ps.pipe(
                    PubSub.publish(frame.payload)
                  )
                })
              )
            )
          ),
          Effect.forever,
          Effect.forkChild
        );

        return {
          socket,
          channels,
          fetchFiber,
          processFiber
        };
      }),
      ({ fetchFiber, processFiber }) => Effect.gen(function*() {
        yield* Fiber.interrupt(fetchFiber);
        yield* Fiber.interrupt(processFiber);
      })
    ).pipe(
      Effect.map(({ socket, channels }) => ({
        getProtocolChannel: Effect.fn("Multiplexer.getProtocolChannel")(
          function*(protocolId: MiniProtocol) {
            return yield* channels.pipe(
              HashMap.get(protocolId),
              Option.match({
                onNone: () => Effect.die(new Error(`Protocol channel not initialized for protocol ID: ${protocolId}`)),
                onSome: (ps) => Effect.succeed({
                  protocolId,
                  incoming: Stream.fromPubSub(ps),
                  send: Effect.fn(`${protocolId}.send`)(
                    (data: Uint8Array) => socket.writer.pipe(
                      Effect.flatMap((write) => write(data))
                    )
                  )
                })
              })
            )
          }
        ),
      }))
    )
  );
}
