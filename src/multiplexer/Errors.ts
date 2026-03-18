import { Schema } from "effect";

/**
 * Multiplexer error types
 */
export class MultiplexerHeaderError
  extends Schema.ErrorClass<MultiplexerHeaderError>("MultiplexerHeaderError")({
    operation: Schema.String,
    rawData: Schema.Uint8Array,
    cause: Schema.Defect,
  }) {}

export class MultiplexerEncodingError
  extends Schema.ErrorClass<MultiplexerEncodingError>(
    "MultiplexerEncodingError",
  )({
    operation: Schema.String,
    payload: Schema.Uint8Array,
    protocol: Schema.Number,
    cause: Schema.Defect,
  }) {}

export type MultiplexerAuxError =
  | MultiplexerHeaderError
  | MultiplexerEncodingError;

/**
 * Multiplexer error types
 */
export class MultiplexerConnectionError
  extends Schema.ErrorClass<MultiplexerConnectionError>(
    "MultiplexerConnectionError",
  )({
    protocolType: Schema.String,
    attempt: Schema.Number,
    cause: Schema.Defect,
  }) {}

export class MultiplexerProtocolError
  extends Schema.ErrorClass<MultiplexerProtocolError>(
    "MultiplexerProtocolError",
  )({
    protocolId: Schema.Number,
    operation: Schema.String,
    cause: Schema.Defect,
  }) {}

export class MultiplexerFrameError
  extends Schema.ErrorClass<MultiplexerFrameError>("MultiplexerFrameError")({
    frameType: Schema.String,
    frameData: Schema.Uint8Array,
    cause: Schema.Defect,
  }) {}

export class MultiplexerBufferError
  extends Schema.ErrorClass<MultiplexerBufferError>("MultiplexerBufferError")({
    cause: Schema.Defect,
  }) {}

export type MultiplexerError =
  | MultiplexerConnectionError
  | MultiplexerProtocolError
  | MultiplexerFrameError
  | MultiplexerBufferError
  | MultiplexerAuxError;
