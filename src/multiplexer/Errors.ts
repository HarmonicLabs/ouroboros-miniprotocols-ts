import { Schema } from "effect";
import { ProcessedFrameSchema } from "./Schemas";

/**
 * Multiplexer error types
 */
export class MultiplexerHeaderError
    extends Schema.TaggedErrorClass<MultiplexerHeaderError>()(
        "MultiplexerHeaderError",
        {
            operation: Schema.String,
            data: Schema.TaggedUnion({
                Parsed: { frame: ProcessedFrameSchema },
                Raw: { raw: Schema.Uint8Array },
            }),
            cause: Schema.Defect,
        },
    ) {}

export class MultiplexerEncodingError
    extends Schema.TaggedErrorClass<MultiplexerEncodingError>()(
        "MultiplexerEncodingError",
        {
            operation: Schema.String,
            payload: Schema.Uint8Array,
            protocol: Schema.Number,
            cause: Schema.Defect,
        },
    ) {}

export type MultiplexerAuxError =
    | MultiplexerHeaderError
    | MultiplexerEncodingError;

/**
 * Multiplexer error types
 */
export class MultiplexerConnectionError
    extends Schema.TaggedErrorClass<MultiplexerConnectionError>()(
        "MultiplexerConnectionError",
        {
            protocolType: Schema.String,
            attempt: Schema.Number,
            cause: Schema.Defect,
        },
    ) {}

export class MultiplexerProtocolError
    extends Schema.TaggedErrorClass<MultiplexerProtocolError>()(
        "MultiplexerProtocolError",
        {
            protocolId: Schema.Number,
            operation: Schema.String,
            cause: Schema.Defect,
        },
    ) {}

export class MultiplexerFrameError
    extends Schema.TaggedErrorClass<MultiplexerFrameError>()(
        "MultiplexerFrameError",
        {
            frameType: Schema.String,
            frameData: Schema.Uint8Array,
            cause: Schema.Defect,
        },
    ) {}

export class MultiplexerBufferError
    extends Schema.TaggedErrorClass<MultiplexerBufferError>()(
        "MultiplexerBufferError",
        {
            cause: Schema.Defect,
        },
    ) {}

export type MultiplexerError =
    | MultiplexerConnectionError
    | MultiplexerProtocolError
    | MultiplexerFrameError
    | MultiplexerBufferError
    | MultiplexerAuxError;
