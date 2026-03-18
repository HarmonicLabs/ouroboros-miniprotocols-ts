import { Config, Duration, Effect, Schema } from "effect"
import * as Socket from "effect/unstable/socket/Socket"

import { MultiplexerConfigSchema, MultiplexerHeaderInfosSchema, MultiplexerHeaderSchema, MultiplexerMessageSchema, MultiplexerProtocolTypeSchema, MultiplexerCloseOptionsSchema } from "./Schemas"


/**
 * Type definitions derived from schemas
 */
export type MultiplexerHeaderInfos = Schema.Schema.Type<typeof MultiplexerHeaderInfosSchema>
export type MultiplexerHeader = Schema.Schema.Type<typeof MultiplexerHeaderSchema>
export type MultiplexerMessage = Schema.Schema.Type<typeof MultiplexerMessageSchema>
export type MultiplexerProtocolType = Schema.Schema.Type<typeof MultiplexerProtocolTypeSchema>
export type MultiplexerCloseOptions = Schema.Schema.Type<typeof MultiplexerCloseOptionsSchema>

/**
 * Multiplexer event listener type for protocol messages
 */
export type MultiplexerEvtListener = (payload: Uint8Array, header: MultiplexerHeader) => Effect.Effect<void>

/**
 * Multiplexer event listeners record per protocol
 */
export interface MultiplexerEvtListeners {
  [key: number]: MultiplexerEvtListener[]
  error: ((err: Error) => Effect.Effect<void>)[]
  data: ((data: Uint8Array) => Effect.Effect<void>)[]
  send: ((payload: Uint8Array, headerInfos: MultiplexerHeaderInfos) => Effect.Effect<void>)[]
}

export const MultiplexerConfig = Config.schema(MultiplexerConfigSchema, "MULTIPLEXER").pipe(
  Config.withDefault({
    protocolType: "node-to-node" as const,
    timeout: Duration.seconds(30),
    bufferSize: 8192,
    maxFrameSize: 32768,
    reconnectAttempts: 3
  })
);

/**
 * Type definitions derived from schemas
 */
export type MultiplexerConfigFields = Schema.Schema.Type<typeof MultiplexerConfigSchema>

/**
 * Multiplexer configuration type (includes runtime fields)
 */
export type MultiplexerConfig = MultiplexerConfigFields & {
  connect: () => Socket.Socket
  initialListeners?: Partial<MultiplexerEvtListeners>
  initialOnceListeners?: Partial<MultiplexerEvtListeners>
}

