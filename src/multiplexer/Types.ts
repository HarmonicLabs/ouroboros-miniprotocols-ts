import { Schema } from "effect";

import {
    MultiplexerConfigSchema,
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
export type MultiplexerHeader = Schema.Schema.Type<
    typeof MultiplexerHeaderSchema
>;
export type MultiplexerMessage = Schema.Schema.Type<
    typeof MultiplexerMessageSchema
>;
export type MultiplexerConfig = Schema.Schema.Type<
    typeof MultiplexerConfigSchema
>;
