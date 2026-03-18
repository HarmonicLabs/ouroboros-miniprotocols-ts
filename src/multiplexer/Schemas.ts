import { MiniProtocolSchema } from "@/MiniProtocol";
import { Schema } from "effect"

export const MultiplexerHeaderSchema = Schema.Struct({
  transmissionTime: Schema.Number,
  hasAgency: Schema.Boolean,
  protocol: MiniProtocolSchema,
  payloadLength: Schema.Int,
})

export const ProcessedFrameSchema = Schema.Struct({
  header: MultiplexerHeaderSchema,
  payload: Schema.Uint8Array
});

export const ProcessedFrameArraySchema = ProcessedFrameSchema.pipe(Schema.Array);

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
 * Schema for multiplexer message
 */
export const MultiplexerMessageSchema = Schema.Struct({
  header: MultiplexerHeaderSchema,
  payload: Schema.Uint8Array
})

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
