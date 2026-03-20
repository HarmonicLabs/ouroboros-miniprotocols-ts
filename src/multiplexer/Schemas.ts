import { Config, Duration, Schema } from "effect";

import { MiniProtocolSchema } from "../MiniProtocol";

export const MultiplexerHeaderSchema = Schema.Struct({
  transmissionTime: Schema.Number,
  hasAgency: Schema.Boolean,
  protocol: MiniProtocolSchema,
  payloadLength: Schema.Int,
});

export const ProcessedFrameSchema = MultiplexerHeaderSchema.pipe(
  Schema.fieldsAssign({ payload: Schema.Uint8Array })
);

export const ProcessedFrameArraySchema = ProcessedFrameSchema.pipe(
  Schema.Array,
);

/**
 * Schema for multiplexer header information
 */
export const MultiplexerHeaderInfosSchema = Schema.Struct({
  hasAgency: Schema.Boolean,
  protocol: Schema.Int,
  transmissionTime: Schema.Int.pipe(Schema.optional),
  payloadLength: Schema.Int.pipe(Schema.optional),
});

/**
 * Schema for multiplexer message
 */
export const MultiplexerMessageSchema = Schema.Struct({
  header: MultiplexerHeaderSchema,
  payload: Schema.Uint8Array,
});

export const MultiplexerProtocolTypeSchema = Schema.Enum({
  NodeToNode: "node-to-node",
  NodeToClient: "node-to-client",
});


/**
 * Schema for multiplexer configuration (serializable/configurable fields)
 */
export const MultiplexerConfigSchema = Schema.Struct({
  protocolType: MultiplexerProtocolTypeSchema,
  timeout: Schema.Duration,
  bufferSize: Schema.Int,
  maxFrameSize: Schema.Int,
  reconnectAttempts: Schema.Int,
});


/**
 * Schema for multiplexer close options
 */
export const MultiplexerCloseOptionsSchema = Schema.Struct({
  closeSocket: Schema.Boolean.pipe(Schema.optional),
});

/**
 * Multiplexer configuration
 */
export const MultiplexerUserConfig = Config.schema(
  MultiplexerConfigSchema,
  "MULTIPLEXER",
).pipe(
  Config.withDefault({
    protocolType: MultiplexerProtocolTypeSchema.enums.NodeToNode,
    timeout: Duration.seconds(30),
    bufferSize: 8192,
    maxFrameSize: 32768,
    reconnectAttempts: 3,
  }),
);
