import { Duration, Schema } from "effect";

import { MiniProtocol, MiniProtocolSchema } from "../MiniProtocol";

export const MultiplexerHeaderSchema = Schema.Struct({
    transmissionTime: Schema.Number,
    hasAgency: Schema.Boolean,
    protocol: MiniProtocolSchema,
    payloadLength: Schema.Int,
});

export const ProcessedFrameSchema = MultiplexerHeaderSchema.pipe(
    Schema.fieldsAssign({ payload: Schema.Uint8Array }),
);

export const ProcessedFrameArraySchema = ProcessedFrameSchema.pipe(
    Schema.Array,
);

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

// ── Spec-aligned constants (Section 2.1.3) ──

/** Maximum SDU frame size per spec Section 2.1.3 (bytes) */
export const MaxFrameSize = 12_288;

/** Default multiplexer config with spec-aligned values */
export const DefaultMultiplexerConfig = {
    protocolType: MultiplexerProtocolTypeSchema.enums.NodeToNode,
    timeout: Duration.seconds(30),
    bufferSize: 8192,
    maxFrameSize: MaxFrameSize,
    reconnectAttempts: 3,
} as const;

/** Per-protocol ingress buffer size limits from spec (bytes) */
export const IngressBufferLimits = {
    [MiniProtocol.Handshake]: 462_000,
    [MiniProtocol.ChainSync]: 230_686_940,
    [MiniProtocol.BlockFetch]: 721_424,
    [MiniProtocol.TxSubmission]: 1_408,
    [MiniProtocol.KeepAlive]: 5_760,
} as const;

/** Per-protocol state timeouts from spec */
export const ProtocolTimeouts = {
    handshake: {
        StPropose: Duration.seconds(10),
        StConfirm: Duration.seconds(10),
    },
    chainSync: {
        StIdle: Duration.seconds(3673),
        StCanAwait: Duration.seconds(10),
    },
    blockFetch: { StIdle: Duration.seconds(60), StBusy: Duration.seconds(60) },
    txSubmission: {
        StInit: Duration.seconds(10),
        StIdle: Duration.seconds(10),
    },
    keepAlive: {
        StClient: Duration.seconds(97),
        StServer: Duration.seconds(60),
    },
    peerSharing: { StIdle: Duration.seconds(60) },
} as const;

/** Per-state size limits from spec (bytes) */
export const StateSizeLimits = {
    handshake: 5_760,
    chainSync: 65_535,
    blockFetchStreaming: 2_500_000,
    txSubmissionBlocking: 2_500_000,
    keepAlive: 65_535,
    peerSharing: 5_760,
} as const;
