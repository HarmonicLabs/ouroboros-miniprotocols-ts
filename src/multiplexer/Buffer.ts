import { Effect, Layer, Schema, ServiceMap } from "effect";
import { MultiplexerBuffer as WasmMultiplexerBuffer } from "wasm-plexer";

import { ProcessedFrameArraySchema } from "./Schemas";
import { MultiplexerBufferError } from "./Errors";

export class MultiplexerBuffer extends ServiceMap.Service<MultiplexerBuffer, {
    appendChunk: (
        chunk: Uint8Array,
    ) => Effect.Effect<void, MultiplexerBufferError>;
    processedFrames: () => Effect.Effect<
        Schema.Schema.Type<typeof ProcessedFrameArraySchema>,
        MultiplexerBufferError | Schema.SchemaError
    >;
    bufferLen: () => Effect.Effect<number, MultiplexerBufferError>;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/Multiplexer") {
    static readonly layer = Layer.effect(
        MultiplexerBuffer,
        Effect.gen(function* () {
            const wasmBuffer = new WasmMultiplexerBuffer();

            return {
                appendChunk: Effect.fn("MultiplexerBuffer.appendChunk")(
                    (chunk: Uint8Array) =>
                        Effect.try({
                            try: () => wasmBuffer.append_chunk(chunk),
                            catch: (e) =>
                                new MultiplexerBufferError({
                                    cause: e as Error,
                                }),
                        }),
                ),
                processedFrames: Effect.fn("MultiplexerBuffer.processFrames")(
                    () =>
                        Effect.try({
                            try: () => wasmBuffer.process_frames(),
                            catch: (e) =>
                                new MultiplexerBufferError({ cause: e }),
                        }).pipe(
                            Effect.flatMap(
                                Schema.decodeUnknownEffect(
                                    ProcessedFrameArraySchema,
                                ),
                            ),
                        ),
                ),
                bufferLen: Effect.fn("MultiplexerBuffer.bufferLen")(
                    () =>
                        Effect.try({
                            try: () => wasmBuffer.buffer_len(),
                            catch: (cause) =>
                                new MultiplexerBufferError({ cause }),
                        }),
                ),
            };
        }),
    );
}

export const MultiplexerBufferLive = MultiplexerBuffer.layer;
