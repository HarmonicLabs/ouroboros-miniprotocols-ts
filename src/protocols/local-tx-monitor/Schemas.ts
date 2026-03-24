import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";

// ── Application-level types ──

export enum LocalTxMonitorMessageType {
    Acquire = "Acquire",
    Acquired = "Acquired",
    Release = "Release",
    NextTx = "NextTx",
    ReplyNextTx = "ReplyNextTx",
    HasTx = "HasTx",
    ReplyHasTx = "ReplyHasTx",
    GetSizes = "GetSizes",
    ReplyGetSizes = "ReplyGetSizes",
    Done = "Done",
}

export const LocalTxMonitorMessageTypeSchema = Schema.Enum(
    LocalTxMonitorMessageType,
);

export const MempoolSizesSchema = Schema.Struct({
    capacity: Schema.Number,
    size: Schema.Number,
    txCount: Schema.Number,
});

export type MempoolSizes = Schema.Schema.Type<typeof MempoolSizesSchema>;

export const LocalTxMonitorMessage = Schema.Union([
    Schema.TaggedStruct(LocalTxMonitorMessageType.Acquire, {}),
    Schema.TaggedStruct(LocalTxMonitorMessageType.Acquired, {
        slot: Schema.Number,
    }),
    Schema.TaggedStruct(LocalTxMonitorMessageType.Release, {}),
    Schema.TaggedStruct(LocalTxMonitorMessageType.NextTx, {}),
    Schema.TaggedStruct(LocalTxMonitorMessageType.ReplyNextTx, {
        tx: Schema.optional(Schema.Uint8Array),
    }),
    Schema.TaggedStruct(LocalTxMonitorMessageType.HasTx, {
        txId: Schema.Uint8Array,
    }),
    Schema.TaggedStruct(LocalTxMonitorMessageType.ReplyHasTx, {
        hasTx: Schema.Boolean,
    }),
    Schema.TaggedStruct(LocalTxMonitorMessageType.GetSizes, {}),
    Schema.TaggedStruct(LocalTxMonitorMessageType.ReplyGetSizes, {
        sizes: MempoolSizesSchema,
    }),
    Schema.TaggedStruct(LocalTxMonitorMessageType.Done, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type LocalTxMonitorMessageT = Schema.Schema.Type<
    typeof LocalTxMonitorMessage
>;

// ── CBOR wire format ──
// [0]                       — Acquire
// [1, slot]                 — Acquired
// [2]                       — Release
// [3]                       — NextTx
// [4, tx?]                  — ReplyNextTx
// [5, txId]                 — HasTx
// [6, hasTx]                — ReplyHasTx
// [7]                       — GetSizes
// [8, capacity, size, cnt]  — ReplyGetSizes
// [9]                       — Done

const AcquireCbor = Schema.Tuple([Schema.Literal(0)]);
const AcquiredCbor = Schema.Tuple([Schema.Literal(1), Schema.Number]);
const ReleaseCbor = Schema.Tuple([Schema.Literal(2)]);
const NextTxCbor = Schema.Tuple([Schema.Literal(3)]);
const ReplyNextTxCbor = Schema.Tuple([
    Schema.Literal(4),
    Schema.optional(Schema.Uint8Array),
]);
const HasTxCbor = Schema.Tuple([Schema.Literal(5), Schema.Uint8Array]);
const ReplyHasTxCbor = Schema.Tuple([Schema.Literal(6), Schema.Boolean]);
const GetSizesCbor = Schema.Tuple([Schema.Literal(7)]);
const ReplyGetSizesCbor = Schema.Tuple([
    Schema.Literal(8),
    Schema.Number,
    Schema.Number,
    Schema.Number,
]);
const DoneCbor = Schema.Tuple([Schema.Literal(9)]);

export const LocalTxMonitorMessageFromCbor = Schema.Union([
    AcquireCbor,
    AcquiredCbor,
    ReleaseCbor,
    NextTxCbor,
    ReplyNextTxCbor,
    HasTxCbor,
    ReplyHasTxCbor,
    GetSizesCbor,
    ReplyGetSizesCbor,
    DoneCbor,
]).pipe(
    Schema.decodeTo(LocalTxMonitorMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(LocalTxMonitorMessage)(
                tuple[0] === 0
                    ? { _tag: LocalTxMonitorMessageType.Acquire }
                    : tuple[0] === 1
                    ? {
                        _tag: LocalTxMonitorMessageType.Acquired,
                        slot: tuple[1],
                    }
                    : tuple[0] === 2
                    ? { _tag: LocalTxMonitorMessageType.Release }
                    : tuple[0] === 3
                    ? { _tag: LocalTxMonitorMessageType.NextTx }
                    : tuple[0] === 4
                    ? {
                        _tag: LocalTxMonitorMessageType.ReplyNextTx,
                        tx: tuple[1],
                    }
                    : tuple[0] === 5
                    ? { _tag: LocalTxMonitorMessageType.HasTx, txId: tuple[1] }
                    : tuple[0] === 6
                    ? {
                        _tag: LocalTxMonitorMessageType.ReplyHasTx,
                        hasTx: tuple[1],
                    }
                    : tuple[0] === 7
                    ? { _tag: LocalTxMonitorMessageType.GetSizes }
                    : tuple[0] === 8
                    ? {
                        _tag: LocalTxMonitorMessageType.ReplyGetSizes,
                        sizes: {
                            capacity: tuple[1],
                            size: tuple[2],
                            txCount: tuple[3],
                        },
                    }
                    : { _tag: LocalTxMonitorMessageType.Done },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid LocalTxMonitor CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) => {
            switch (msg._tag) {
                case LocalTxMonitorMessageType.Acquire:
                    return [0];
                case LocalTxMonitorMessageType.Acquired:
                    return [1, msg.slot];
                case LocalTxMonitorMessageType.Release:
                    return [2];
                case LocalTxMonitorMessageType.NextTx:
                    return [3];
                case LocalTxMonitorMessageType.ReplyNextTx:
                    return [4, msg.tx];
                case LocalTxMonitorMessageType.HasTx:
                    return [5, msg.txId];
                case LocalTxMonitorMessageType.ReplyHasTx:
                    return [6, msg.hasTx];
                case LocalTxMonitorMessageType.GetSizes:
                    return [7];
                case LocalTxMonitorMessageType.ReplyGetSizes:
                    return [
                        8,
                        msg.sizes.capacity,
                        msg.sizes.size,
                        msg.sizes.txCount,
                    ];
                case LocalTxMonitorMessageType.Done:
                    return [9];
            }
        }),
    }),
);

export const LocalTxMonitorMessageBytes = CborBytes(
    LocalTxMonitorMessageFromCbor,
);
