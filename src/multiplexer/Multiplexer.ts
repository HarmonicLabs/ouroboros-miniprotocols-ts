import { Effect, Layer, Schema, ServiceMap, Stream, HashMap, Ref, Fiber, Option, PubSub, Scope } from "effect"
import * as Socket from "effect/unstable/socket/Socket"
import { MultiplexerConfigSchema } from "./MultiplexerSchemas"
import { MiniProtocol } from "../MiniProtocol"

// Utility functions for multiplexing messages
const agencyMask = 0x8000; // (1 << 15)
const protocolMask = 0x7fff; // ~agencyMask & 0xffff

export function wrapMultiplexerMessage(
  payload: Uint8Array,
  { protocol, hasAgency }: { protocol: MiniProtocol; hasAgency: boolean }
): Uint8Array {
  const buff = new ArrayBuffer(payload.length + 8)
  const result = new Uint8Array(buff)
  const view = new DataView(buff)

  view.setUint16(
    4,
    (hasAgency ? 0 : 1 << 15) | (protocol & 0xffff),
    false
  )

  view.setUint16(6, payload.length & 0xffff, false)
  result.set(payload, 8)

  view.setUint32(
    0,
    Math.ceil(performance.timeOrigin * 1000 + performance.now() * 1000) & 0xffffffff,
    false
  )

  return result
}

export function unwrapMultiplexerMessage(message: Uint8Array): { header: { transmissionTime: number; hasAgency: boolean; protocol: MiniProtocol; payloadLength: number }; payload: Uint8Array } {
  const view = new DataView(message.buffer)
  const agencyAndProtocol = message[4] << 8 | message[5]
  const payloadLen = message[6] << 8 | message[7]

  return {
    header: {
      transmissionTime: view.getUint32(0, false),
      hasAgency: (agencyAndProtocol & agencyMask) > 0,
      protocol: agencyAndProtocol & protocolMask,
      payloadLength: payloadLen
    },
    payload: message.slice(8, 8 + payloadLen)
  }
}

/**
 * Multiplexer error types
 */
 export class MultiplexerInitError extends Schema.ErrorClass<MultiplexerInitError>("MultiplexerInitError")({
   cause: Schema.Defect,
 }) {}

export class MultiplexerConnectionError extends Schema.ErrorClass<MultiplexerConnectionError>("MultiplexerConnectionError")({
  protocolType: Schema.String,
  attempt: Schema.Number,
  cause: Schema.Defect
}) {}

export class MultiplexerProtocolError extends Schema.ErrorClass<MultiplexerProtocolError>("MultiplexerProtocolError")({
  protocolId: Schema.Number,
  operation: Schema.String,
  cause: Schema.Defect
}) {}

export class MultiplexerFrameError extends Schema.ErrorClass<MultiplexerFrameError>("MultiplexerFrameError")({
  frameType: Schema.String,
  frameData: Schema.Uint8Array,
  cause: Schema.Defect
}) {}

export type MultiplexerError = MultiplexerInitError | MultiplexerConnectionError | MultiplexerProtocolError | MultiplexerFrameError

/**
 * Protocol channel for streaming messages
 */
export interface ProtocolChannel {
  readonly protocolId: MiniProtocol
  readonly incoming: Stream.Stream<Uint8Array>
  readonly send: (data: Uint8Array) => Effect.Effect<void>
}

/**
 * Effect-TS Multiplexer service
 */
export class Multiplexer extends ServiceMap.Service<Multiplexer, {
  /**
   * Get a protocol channel for streaming messages
   */
  getProtocolChannel: (protocolId: MiniProtocol) => Effect.Effect<ProtocolChannel>

  /**
   * Start the multiplexer with the given socket
   */
  start: (socket: Socket.Socket) => Effect.Effect<void>

  /**
   * Stop the multiplexer
   */
  stop: () => Effect.Effect<void>

  /**
   * Check if multiplexer is running
   */
  isRunning: () => Effect.Effect<boolean>
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/Multiplexer") {
  static readonly withConfig = Layer.effect(
    Multiplexer,
    Effect.gen(function*() {
      return {
        protocolChannels: yield* Ref.make(HashMap.fromIterable([
          [MiniProtocol.BlockFetch, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.ChainSync, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.Handshake, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.KeepAlive, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalChainSync, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalStateQuery, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalTxSubmission, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.TxSubmission, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.LocalTxMonitor, yield* PubSub.unbounded<Uint8Array>()],
          [MiniProtocol.PeerSharing, yield* PubSub.unbounded<Uint8Array>()],
        ])),
        socketRef: yield* Ref.make(yield* Socket.Socket),
        readFiberRef: yield* Ref.make<Option.Option<Fiber.Fiber<void, MultiplexerError>>>(Option.none()),
        isRunningRef: yield* Ref.make(false)
      };
    }).pipe(
      Effect.map(({
        protocolChannels,
        socketRef,
        readFiberRef,
        isRunningRef,
      }) => ({
        getProtocolChannel: Effect.fn("Multiplexer.getProtocolChannel")(
          (protocolId: MiniProtocol) =>
            protocolChannels.pipe(
              Ref.get,
              Effect.map(HashMap.get(protocolId)),
              Effect.flatMap(Option.match({
                onNone: () => Effect.fail(new MultiplexerInitError({
                  cause: new Error("PubSub channels not initialized")
                })),
                onSome: (ps) => Effect.succeed({
                  protocolId,
                  incoming: Stream.fromPubSub(ps),
                  send: Effect.fn(`${protocolId}.send`)(
                    (data: Uint8Array) => socketRef.pipe(
                      Ref.get,
                      Effect.flatMap((socket) => socket.writer),
                      Effect.flatMap((write) => write(data))
                    )
                  )
                })
              }))
            )
        ),
        start: Effect.fn("Multiplexer.start")(
          (socket: Socket.Socket) =>
            Effect.fail(new MultiplexerInitError({ cause: new Error("Not implemented yet") }))
        ),
        stop: Effect.fn("Multiplexer.stop")(
          function*() {
            // return yield* Effect.void;
            return yield* Effect.fail(new Error("Some error"));
          }
        ),
        isRunning: Effect.fn("Multiplexer.isRunning")(
          function*() {
            return yield* Effect.fail(new MultiplexerInitError({ cause: new Error("Not implemented yet") }));
          }
        )
      }))
    )
  );
}
