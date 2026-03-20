import { Effect, Schema } from "effect";
import * as Socket from "effect/unstable/socket/Socket";

import {
  MultiplexerCloseOptionsSchema,
  MultiplexerConfigSchema,
  MultiplexerHeaderInfosSchema,
  MultiplexerHeaderSchema,
  MultiplexerMessageSchema,
  MultiplexerProtocolTypeSchema,
} from "./Schemas";

/**
 * Type definitions derived from schemas
 */
export type MultiplexerProtocolType = Schema.Schema.Type<
  typeof MultiplexerProtocolTypeSchema
>;
export type MultiplexerHeaderInfos = Schema.Schema.Type<
  typeof MultiplexerHeaderInfosSchema
>;
export type MultiplexerHeader = Schema.Schema.Type<
  typeof MultiplexerHeaderSchema
>;
export type MultiplexerMessage = Schema.Schema.Type<
  typeof MultiplexerMessageSchema
>;
export type MultiplexerCloseOptions = Schema.Schema.Type<
  typeof MultiplexerCloseOptionsSchema
>;

/**
 * Multiplexer event listener type for protocol messages
 */
export type MultiplexerEvtListener = (
  payload: Uint8Array,
  header: MultiplexerHeader,
) => Effect.Effect<void>;

/**
 * Multiplexer event listeners record per protocol
 */
export interface MultiplexerEvtListeners {
  [key: number]: MultiplexerEvtListener[];
  error: ((err: Error) => Effect.Effect<void>)[];
  data: ((data: Uint8Array) => Effect.Effect<void>)[];
  send: ((
    payload: Uint8Array,
    headerInfos: MultiplexerHeaderInfos,
  ) => Effect.Effect<void>)[];
}

/**
 * Multiplexer configuration type (includes runtime fields)
 */
export type MultiplexerConfig = Schema.Schema.Type<typeof MultiplexerConfigSchema> & {
  connect: () => Socket.Socket;
  initialListeners?: Partial<MultiplexerEvtListeners>;
  initialOnceListeners?: Partial<MultiplexerEvtListeners>;
};
