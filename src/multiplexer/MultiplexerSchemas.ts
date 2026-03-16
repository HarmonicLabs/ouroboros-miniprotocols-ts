import { Schema, Effect } from "effect"
import * as Socket from "effect/unstable/socket/Socket"

/**
 * Schema for multiplexer header information
 */
export const MultiplexerHeaderInfosSchema = Schema.Struct({
  hasAgency: Schema.Boolean,
  protocol: Schema.Int,
  transmissionTime: Schema.Int.pipe(Schema.optional),
  payloadLength: Schema.Int.pipe(Schema.optional)
})

/**
 * Schema for multiplexer header (with required fields)
 */
export const MultiplexerHeaderSchema = Schema.Struct({
  hasAgency: Schema.Boolean,
  protocol: Schema.Int,
  transmissionTime: Schema.Int,
  payloadLength: Schema.Int
})

/**
 * Schema for multiplexer message
 */
export const MultiplexerMessageSchema = Schema.Struct({
  header: MultiplexerHeaderSchema,
  payload: Schema.Uint8Array
})

/**
 * Schema for multiplexer protocol type
 */
export const MultiplexerProtocolTypeSchema = Schema.Literals(["node-to-node", "node-to-client"])

/**
 * Schema for multiplexer close options
 */
export const MultiplexerCloseOptionsSchema = Schema.Struct({
  closeSocket: Schema.Boolean.pipe(Schema.optional)
})

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

/**
 * Schema for multiplexer configuration (serializable/configurable fields)
 */
export const MultiplexerConfigSchema = Schema.Struct({
  protocolType: Schema.Literals(["node-to-node", "node-to-client"]),
  timeout: Schema.Duration,
  bufferSize: Schema.Int,
  maxFrameSize: Schema.Int,
  reconnectAttempts: Schema.Int
})


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

/**
 * Multiplexer error types
 */
export class MultiplexerHeaderError extends Schema.ErrorClass<MultiplexerHeaderError>("MultiplexerHeaderError")({
  operation: Schema.String,
  rawData: Schema.Uint8Array,
  cause: Schema.Defect
}) {}

export class MultiplexerEncodingError extends Schema.ErrorClass<MultiplexerEncodingError>("MultiplexerEncodingError")({
  operation: Schema.String,
  payload: Schema.Uint8Array,
  protocol: Schema.Number,
  cause: Schema.Defect
}) {}

export type MultiplexerAuxError = MultiplexerHeaderError | MultiplexerEncodingError
