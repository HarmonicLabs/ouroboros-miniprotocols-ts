import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";

// ── Application-level types ──

export enum TxSubmissionMessageType {
    RequestTxIds = "RequestTxIds",
    ReplyTxIds = "ReplyTxIds",
    RequestTxs = "RequestTxs",
    ReplyTxs = "ReplyTxs",
    Done = "Done",
    Init = "Init",
}

export const TxSubmissionMessageTypeSchema = Schema.Enum(
    TxSubmissionMessageType,
);

export const TxIdAndSizeSchema = Schema.Struct({
    txId: Schema.Uint8Array,
    size: Schema.Number,
});

export type TxIdAndSize = Schema.Schema.Type<typeof TxIdAndSizeSchema>;

export const TxSubmissionMessage = Schema.Union([
    Schema.TaggedStruct(TxSubmissionMessageType.RequestTxIds, {
        blocking: Schema.Boolean,
        ack: Schema.Number,
        req: Schema.Number,
    }),
    Schema.TaggedStruct(TxSubmissionMessageType.ReplyTxIds, {
        ids: Schema.Array(TxIdAndSizeSchema),
    }),
    Schema.TaggedStruct(TxSubmissionMessageType.RequestTxs, {
        txIds: Schema.Array(Schema.Uint8Array),
    }),
    Schema.TaggedStruct(TxSubmissionMessageType.ReplyTxs, {
        txs: Schema.Array(Schema.Uint8Array),
    }),
    Schema.TaggedStruct(TxSubmissionMessageType.Done, {}),
    Schema.TaggedStruct(TxSubmissionMessageType.Init, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type TxSubmissionMessageT = Schema.Schema.Type<
    typeof TxSubmissionMessage
>;

// ── CBOR wire format ──
// [0, blocking, ack, req]   — RequestTxIds
// [1, [[txId, size]*]]      — ReplyTxIds
// [2, [txId*]]              — RequestTxs
// [3, [tx*]]                — ReplyTxs
// [4]                       — Done
// [6]                       — Init

const TxIdAndSizeCbor = Schema.Tuple([Schema.Uint8Array, Schema.Number]);

const RequestTxIdsCbor = Schema.Tuple([
    Schema.Literal(0),
    Schema.Boolean,
    Schema.Number,
    Schema.Number,
]);
const ReplyTxIdsCbor = Schema.Tuple([
    Schema.Literal(1),
    Schema.Array(TxIdAndSizeCbor),
]);
const RequestTxsCbor = Schema.Tuple([
    Schema.Literal(2),
    Schema.Array(Schema.Uint8Array),
]);
const ReplyTxsCbor = Schema.Tuple([
    Schema.Literal(3),
    Schema.Array(Schema.Uint8Array),
]);
const DoneCbor = Schema.Tuple([Schema.Literal(4)]);
const InitCbor = Schema.Tuple([Schema.Literal(6)]);

export const TxSubmissionMessageFromCbor = Schema.Union([
    RequestTxIdsCbor,
    ReplyTxIdsCbor,
    RequestTxsCbor,
    ReplyTxsCbor,
    DoneCbor,
    InitCbor,
]).pipe(
    Schema.decodeTo(TxSubmissionMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(TxSubmissionMessage)(
                tuple[0] === 0
                    ? {
                        _tag: TxSubmissionMessageType.RequestTxIds,
                        blocking: tuple[1],
                        ack: tuple[2],
                        req: tuple[3],
                    }
                    : tuple[0] === 1
                    ? {
                        _tag: TxSubmissionMessageType.ReplyTxIds,
                        ids: (tuple[1] as ReadonlyArray<
                            readonly [Uint8Array, number]
                        >).map(
                            ([txId, size]) => ({ txId, size }),
                        ),
                    }
                    : tuple[0] === 2
                    ? {
                        _tag: TxSubmissionMessageType.RequestTxs,
                        txIds: tuple[1],
                    }
                    : tuple[0] === 3
                    ? { _tag: TxSubmissionMessageType.ReplyTxs, txs: tuple[1] }
                    : tuple[0] === 4
                    ? { _tag: TxSubmissionMessageType.Done }
                    : { _tag: TxSubmissionMessageType.Init },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid TxSubmission CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) => {
            switch (msg._tag) {
                case TxSubmissionMessageType.RequestTxIds:
                    return [0, msg.blocking, msg.ack, msg.req];
                case TxSubmissionMessageType.ReplyTxIds:
                    return [
                        1,
                        msg.ids.map((
                            id,
                        ): readonly [Uint8Array, number] => [id.txId, id.size]),
                    ];
                case TxSubmissionMessageType.RequestTxs:
                    return [2, msg.txIds];
                case TxSubmissionMessageType.ReplyTxs:
                    return [3, msg.txs];
                case TxSubmissionMessageType.Done:
                    return [4];
                case TxSubmissionMessageType.Init:
                    return [6];
            }
        }),
    }),
);

export const TxSubmissionMessageBytes = CborBytes(TxSubmissionMessageFromCbor);
