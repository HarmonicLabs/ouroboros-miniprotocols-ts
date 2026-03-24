import { Effect } from "effect";
import { describe, it, layer } from "@effect/vitest";
import {
    unwrap_multiplexer_message,
    wrap_multiplexer_message,
} from "wasm-plexer";
import { MultiplexerBuffer, MultiplexerBufferLive } from "../Buffer";
import { MiniProtocol } from "../../MiniProtocol";

describe("Multiplexer", () => {
    describe("MultiplexerBuffer", () => {
        layer(MultiplexerBufferLive)("buffer", (it) => {
            it.effect("should append chunk and process frames", () =>
                Effect.gen(function* () {
                    const buffer = yield* MultiplexerBuffer;

                    // Create a valid frame
                    const payload = new Uint8Array([1, 2, 3, 4, 5]);
                    const wrapped = wrap_multiplexer_message(
                        payload,
                        MiniProtocol.Handshake,
                        true,
                    );

                    yield* buffer.appendChunk(wrapped);

                    const frames = yield* buffer.processedFrames();

                    // Assert that frames were processed
                    expect(frames.length).toBe(1);
                    expect(frames[0].protocol).toBe(MiniProtocol.Handshake);
                    expect(frames[0].hasAgency).toBe(true);
                    expect(frames[0].payload).toEqual(payload);
                }));

            it.effect("buffer length should be correct", () =>
                Effect.gen(function* () {
                    const buffer = yield* MultiplexerBuffer;

                    const chunk = new Uint8Array([1, 2, 3]);
                    yield* buffer.appendChunk(chunk);

                    const len = yield* buffer.bufferLen();
                    expect(len).toBe(3);
                }));
        });
    });

    describe("Message Functions", () => {
        it("should wrap and unwrap multiplexer messages", () => {
            const payload = new Uint8Array([1, 2, 3, 4, 5]);
            const protocol = MiniProtocol.Handshake;
            const hasAgency = true;

            const wrapped = wrap_multiplexer_message(
                payload,
                protocol,
                hasAgency,
            );
            expect(wrapped).toBeInstanceOf(Uint8Array);
            expect(wrapped.length).toBeGreaterThan(payload.length);

            const unwrapped = unwrap_multiplexer_message(wrapped);
            expect(unwrapped.protocol).toBe(protocol);
            expect(unwrapped.hasAgency).toBe(hasAgency);
            expect(unwrapped.payload).toEqual(payload);
        });

        it("should handle invalid messages", () => {
            const invalid = new Uint8Array([1, 2]); // Too short

            expect(() => unwrap_multiplexer_message(invalid)).toThrow();
        });
    });
});
