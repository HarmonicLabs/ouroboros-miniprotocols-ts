import type { MultiplexerHeader } from "../multiplexer";

export type ErrorListener = (err: Error) => void;
export type DataListener = (data: Uint8Array) => void;
export type SendListener = (payload: Uint8Array, header: MultiplexerHeader) => void;