import { Effect, Schema } from "effect";
import { MultiplexerHeader } from "./multiplexer"; 

/**
 * Schema for options when adding an event listener.
 */
export const AddEvtListenerOptsSchema = Schema.Struct({
  once: Schema.Boolean.pipe(Schema.optionalKey)
});

/**
 * Type for AddEvtListenerOpts, inferred from the schema.
 */
export type AddEvtListenerOpts = Schema.Schema.Type<typeof AddEvtListenerOptsSchema>;

/**
 * Error listener function type.
 */
export type ErrorListener = (err: Error) => Effect.Effect<void>;

/**
 * Data listener function type.
 */
export type DataListener = (data: Uint8Array) => Effect.Effect<void>;

/**
 * Send listener function type.
 * Note: MultiplexerHeader import is assumed to be available; adjust if needed in the new multiplexer.
 */
export type SendListener = (payload: Uint8Array, header: MultiplexerHeader) => Effect.Effect<void>;
