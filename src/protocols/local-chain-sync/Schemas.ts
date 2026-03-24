import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";
import { ChainPointFromCbor, ChainPointSchema } from "../types/ChainPoint";
import { ChainTipFromCbor, ChainTipSchema } from "../types/ChainTip";

// LocalChainSync has the same state machine as ChainSync but uses
// mini-protocol ID #5 and transports full blocks instead of headers.

export enum LocalChainSyncMessageType {
    RequestNext = "RequestNext",
    AwaitReply = "AwaitReply",
    RollForward = "RollForward",
    RollBackward = "RollBackward",
    FindIntersect = "FindIntersect",
    IntersectFound = "IntersectFound",
    IntersectNotFound = "IntersectNotFound",
    Done = "Done",
}

export const LocalChainSyncMessageTypeSchema = Schema.Enum(
    LocalChainSyncMessageType,
);

export const LocalChainSyncMessage = Schema.Union([
    Schema.TaggedStruct(LocalChainSyncMessageType.RequestNext, {}),
    Schema.TaggedStruct(LocalChainSyncMessageType.AwaitReply, {}),
    Schema.TaggedStruct(LocalChainSyncMessageType.RollForward, {
        block: Schema.Uint8Array,
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(LocalChainSyncMessageType.RollBackward, {
        point: ChainPointSchema,
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(LocalChainSyncMessageType.FindIntersect, {
        points: Schema.Array(ChainPointSchema),
    }),
    Schema.TaggedStruct(LocalChainSyncMessageType.IntersectFound, {
        point: ChainPointSchema,
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(LocalChainSyncMessageType.IntersectNotFound, {
        tip: ChainTipSchema,
    }),
    Schema.TaggedStruct(LocalChainSyncMessageType.Done, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type LocalChainSyncMessageT = Schema.Schema.Type<
    typeof LocalChainSyncMessage
>;

// ── CBOR wire format (same as ChainSync but with full blocks) ──

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

export const LocalChainSyncMessageFromCbor = Schema.Union([
    RequestNextCbor,
    AwaitReplyCbor,
    RollForwardCbor,
    RollBackwardCbor,
    FindIntersectCbor,
    IntersectFoundCbor,
    IntersectNotFoundCbor,
    DoneCbor,
]).pipe(
    Schema.decodeTo(LocalChainSyncMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(LocalChainSyncMessage)(
                tuple[0] === 0
                    ? { _tag: LocalChainSyncMessageType.RequestNext }
                    : tuple[0] === 1
                    ? { _tag: LocalChainSyncMessageType.AwaitReply }
                    : tuple[0] === 2
                    ? {
                        _tag: LocalChainSyncMessageType.RollForward,
                        block: tuple[1],
                        tip: tuple[2],
                    }
                    : tuple[0] === 3
                    ? {
                        _tag: LocalChainSyncMessageType.RollBackward,
                        point: tuple[1],
                        tip: tuple[2],
                    }
                    : tuple[0] === 4
                    ? {
                        _tag: LocalChainSyncMessageType.FindIntersect,
                        points: tuple[1],
                    }
                    : tuple[0] === 5
                    ? {
                        _tag: LocalChainSyncMessageType.IntersectFound,
                        point: tuple[1],
                        tip: tuple[2],
                    }
                    : tuple[0] === 6
                    ? {
                        _tag: LocalChainSyncMessageType.IntersectNotFound,
                        tip: tuple[1],
                    }
                    : { _tag: LocalChainSyncMessageType.Done },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid LocalChainSync CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) => {
            switch (msg._tag) {
                case LocalChainSyncMessageType.RequestNext:
                    return [0];
                case LocalChainSyncMessageType.AwaitReply:
                    return [1];
                case LocalChainSyncMessageType.RollForward:
                    return [2, msg.block, msg.tip];
                case LocalChainSyncMessageType.RollBackward:
                    return [3, msg.point, msg.tip];
                case LocalChainSyncMessageType.FindIntersect:
                    return [4, msg.points];
                case LocalChainSyncMessageType.IntersectFound:
                    return [5, msg.point, msg.tip];
                case LocalChainSyncMessageType.IntersectNotFound:
                    return [6, msg.tip];
                case LocalChainSyncMessageType.Done:
                    return [7];
            }
        }),
    }),
);

export const LocalChainSyncMessageBytes = CborBytes(
    LocalChainSyncMessageFromCbor,
);
