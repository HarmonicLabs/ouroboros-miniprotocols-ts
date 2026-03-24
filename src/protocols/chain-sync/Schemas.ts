import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";
import { ChainPointFromCbor, ChainPointSchema } from "../types/ChainPoint";
import { ChainTipFromCbor, ChainTipSchema } from "../types/ChainTip";

// ── Application-level types ──

export enum ChainSyncMessageType {
    RequestNext = "RequestNext",
    AwaitReply = "AwaitReply",
    RollForward = "RollForward",
    RollBackward = "RollBackward",
    FindIntersect = "FindIntersect",
    IntersectFound = "IntersectFound",
    IntersectNotFound = "IntersectNotFound",
    Done = "Done",
}

export const ChainSyncMessageTypeSchema = Schema.Enum(ChainSyncMessageType);

export const ChainSyncMessage = Schema.Union([
    Schema.TaggedStruct(ChainSyncMessageType.RequestNext, {}),
    Schema.TaggedStruct(ChainSyncMessageType.AwaitReply, {}),
    Schema.TaggedStruct(ChainSyncMessageType.RollForward, {
        header: Schema.Uint8Array,
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(ChainSyncMessageType.RollBackward, {
        point: ChainPointSchema,
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(ChainSyncMessageType.FindIntersect, {
        points: Schema.Array(ChainPointSchema),
    }),
    Schema.TaggedStruct(ChainSyncMessageType.IntersectFound, {
        point: ChainPointSchema,
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(ChainSyncMessageType.IntersectNotFound, {
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(ChainSyncMessageType.Done, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type ChainSyncMessageT = Schema.Schema.Type<typeof ChainSyncMessage>;

// ── CBOR wire format ──
// [0]                — RequestNext
// [1]                — AwaitReply
// [2, header, tip]   — RollForward
// [3, point, tip]    — RollBackward
// [4, [point*]]      — FindIntersect
// [5, point, tip]    — IntersectFound
// [6, tip]           — IntersectNotFound
// [7]                — Done

const RequestNextCbor = Schema.Tuple([Schema.Literal(0)]);
const AwaitReplyCbor = Schema.Tuple([Schema.Literal(1)]);
const RollForwardCbor = Schema.Tuple([
    Schema.Literal(2),
    Schema.Uint8Array,
    ChainTipFromCbor,
]);
const RollBackwardCbor = Schema.Tuple([
    Schema.Literal(3),
    ChainPointFromCbor,
    ChainTipFromCbor,
]);
const FindIntersectCbor = Schema.Tuple([
    Schema.Literal(4),
    Schema.Array(ChainPointFromCbor),
]);
const IntersectFoundCbor = Schema.Tuple([
    Schema.Literal(5),
    ChainPointFromCbor,
    ChainTipFromCbor,
]);
const IntersectNotFoundCbor = Schema.Tuple([
    Schema.Literal(6),
    ChainTipFromCbor,
]);
const DoneCbor = Schema.Tuple([Schema.Literal(7)]);

export const ChainSyncMessageFromCbor = Schema.Union([
    RequestNextCbor,
    AwaitReplyCbor,
    RollForwardCbor,
    RollBackwardCbor,
    FindIntersectCbor,
    IntersectFoundCbor,
    IntersectNotFoundCbor,
    DoneCbor,
]).pipe(
    Schema.decodeTo(ChainSyncMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(ChainSyncMessage)(
                tuple[0] === 0
                    ? { _tag: ChainSyncMessageType.RequestNext }
                    : tuple[0] === 1
                    ? { _tag: ChainSyncMessageType.AwaitReply }
                    : tuple[0] === 2
                    ? {
                        _tag: ChainSyncMessageType.RollForward,
                        header: tuple[1],
                        tip: tuple[2],
                    }
                    : tuple[0] === 3
                    ? {
                        _tag: ChainSyncMessageType.RollBackward,
                        point: tuple[1],
                        tip: tuple[2],
                    }
                    : tuple[0] === 4
                    ? {
                        _tag: ChainSyncMessageType.FindIntersect,
                        points: tuple[1],
                    }
                    : tuple[0] === 5
                    ? {
                        _tag: ChainSyncMessageType.IntersectFound,
                        point: tuple[1],
                        tip: tuple[2],
                    }
                    : tuple[0] === 6
                    ? {
                        _tag: ChainSyncMessageType.IntersectNotFound,
                        tip: tuple[1],
                    }
                    : { _tag: ChainSyncMessageType.Done },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid ChainSync CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) => {
            switch (msg._tag) {
                case ChainSyncMessageType.RequestNext:
                    return [0];
                case ChainSyncMessageType.AwaitReply:
                    return [1];
                case ChainSyncMessageType.RollForward:
                    return [2, msg.header, msg.tip];
                case ChainSyncMessageType.RollBackward:
                    return [3, msg.point, msg.tip];
                case ChainSyncMessageType.FindIntersect:
                    return [4, msg.points];
                case ChainSyncMessageType.IntersectFound:
                    return [5, msg.point, msg.tip];
                case ChainSyncMessageType.IntersectNotFound:
                    return [6, msg.tip];
                case ChainSyncMessageType.Done:
                    return [7];
            }
        }),
    }),
);

export const ChainSyncMessageBytes = CborBytes(ChainSyncMessageFromCbor);
