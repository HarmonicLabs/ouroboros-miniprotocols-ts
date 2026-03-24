import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";
import { ChainPointFromCbor, ChainPointSchema } from "../types/ChainPoint";

// ── Application-level types ──

export enum LocalStateQueryMessageType {
    Acquire = "Acquire",
    Acquired = "Acquired",
    Failure = "Failure",
    Query = "Query",
    Result = "Result",
    ReAcquire = "ReAcquire",
    Release = "Release",
    Done = "Done",
}

export const LocalStateQueryMessageTypeSchema = Schema.Enum(
    LocalStateQueryMessageType,
);

export const LocalStateQueryMessage = Schema.Union([
    Schema.TaggedStruct(LocalStateQueryMessageType.Acquire, {
        point: Schema.optional(ChainPointSchema),
    }),
    Schema.TaggedStruct(LocalStateQueryMessageType.Acquired, {}),
    Schema.TaggedStruct(LocalStateQueryMessageType.Failure, {
        failure: Schema.Uint8Array,
    }),
    Schema.TaggedStruct(LocalStateQueryMessageType.Query, {
        query: Schema.Uint8Array,
    }),
    Schema.TaggedStruct(LocalStateQueryMessageType.Result, {
        result: Schema.Uint8Array,
    }),
    Schema.TaggedStruct(LocalStateQueryMessageType.ReAcquire, {
        point: Schema.optional(ChainPointSchema),
    }),
    Schema.TaggedStruct(LocalStateQueryMessageType.Release, {}),
    Schema.TaggedStruct(LocalStateQueryMessageType.Done, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type LocalStateQueryMessageT = Schema.Schema.Type<
    typeof LocalStateQueryMessage
>;

// ── CBOR wire format ──
// [0, point?]   — Acquire
// [1]           — Acquired
// [2, failure]  — Failure
// [3, query]    — Query
// [4, result]   — Result
// [5, point?]   — ReAcquire
// [6]           — Release
// [7]           — Done

const AcquireCbor = Schema.Tuple([
    Schema.Literal(0),
    Schema.optional(ChainPointFromCbor),
]);
const AcquiredCbor = Schema.Tuple([Schema.Literal(1)]);
const FailureCbor = Schema.Tuple([Schema.Literal(2), Schema.Uint8Array]);
const QueryCbor = Schema.Tuple([Schema.Literal(3), Schema.Uint8Array]);
const ResultCbor = Schema.Tuple([Schema.Literal(4), Schema.Uint8Array]);
const ReAcquireCbor = Schema.Tuple([
    Schema.Literal(5),
    Schema.optional(ChainPointFromCbor),
]);
const ReleaseCbor = Schema.Tuple([Schema.Literal(6)]);
const DoneCbor = Schema.Tuple([Schema.Literal(7)]);

export const LocalStateQueryMessageFromCbor = Schema.Union([
    AcquireCbor,
    AcquiredCbor,
    FailureCbor,
    QueryCbor,
    ResultCbor,
    ReAcquireCbor,
    ReleaseCbor,
    DoneCbor,
]).pipe(
    Schema.decodeTo(LocalStateQueryMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(LocalStateQueryMessage)(
                tuple[0] === 0
                    ? {
                        _tag: LocalStateQueryMessageType.Acquire,
                        point: tuple[1],
                    }
                    : tuple[0] === 1
                    ? { _tag: LocalStateQueryMessageType.Acquired }
                    : tuple[0] === 2
                    ? {
                        _tag: LocalStateQueryMessageType.Failure,
                        failure: tuple[1],
                    }
                    : tuple[0] === 3
                    ? {
                        _tag: LocalStateQueryMessageType.Query,
                        query: tuple[1],
                    }
                    : tuple[0] === 4
                    ? {
                        _tag: LocalStateQueryMessageType.Result,
                        result: tuple[1],
                    }
                    : tuple[0] === 5
                    ? {
                        _tag: LocalStateQueryMessageType.ReAcquire,
                        point: tuple[1],
                    }
                    : tuple[0] === 6
                    ? { _tag: LocalStateQueryMessageType.Release }
                    : { _tag: LocalStateQueryMessageType.Done },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid LocalStateQuery CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) => {
            switch (msg._tag) {
                case LocalStateQueryMessageType.Acquire:
                    return [0, msg.point];
                case LocalStateQueryMessageType.Acquired:
                    return [1];
                case LocalStateQueryMessageType.Failure:
                    return [2, msg.failure];
                case LocalStateQueryMessageType.Query:
                    return [3, msg.query];
                case LocalStateQueryMessageType.Result:
                    return [4, msg.result];
                case LocalStateQueryMessageType.ReAcquire:
                    return [5, msg.point];
                case LocalStateQueryMessageType.Release:
                    return [6];
                case LocalStateQueryMessageType.Done:
                    return [7];
            }
        }),
    }),
);

export const LocalStateQueryMessageBytes = CborBytes(
    LocalStateQueryMessageFromCbor,
);
