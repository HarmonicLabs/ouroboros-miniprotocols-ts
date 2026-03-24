import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";
import { ChainPointFromCbor, ChainPointSchema } from "../types/ChainPoint";

// ── Application-level types ──

export enum BlockFetchMessageType {
    RequestRange = "RequestRange",
    ClientDone = "ClientDone",
    StartBatch = "StartBatch",
    NoBlocks = "NoBlocks",
    Block = "Block",
    BatchDone = "BatchDone",
}

export const BlockFetchMessageTypeSchema = Schema.Enum(BlockFetchMessageType);

export const BlockFetchMessage = Schema.Union([
    Schema.TaggedStruct(BlockFetchMessageType.RequestRange, {
        from: ChainPointSchema,
        to: ChainPointSchema,
    }),
    Schema.TaggedStruct(BlockFetchMessageType.ClientDone, {}),
    Schema.TaggedStruct(BlockFetchMessageType.StartBatch, {}),
    Schema.TaggedStruct(BlockFetchMessageType.NoBlocks, {}),
    Schema.TaggedStruct(BlockFetchMessageType.Block, {
        block: Schema.Uint8Array,
    }),
    Schema.TaggedStruct(BlockFetchMessageType.BatchDone, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type BlockFetchMessageT = Schema.Schema.Type<typeof BlockFetchMessage>;

// ── CBOR wire format ──
// [0, from, to] — RequestRange
// [1]           — ClientDone
// [2]           — StartBatch
// [3]           — NoBlocks
// [4, block]    — Block
// [5]           — BatchDone

const RequestRangeCbor = Schema.Tuple([
    Schema.Literal(0),
    ChainPointFromCbor,
    ChainPointFromCbor,
]);
const ClientDoneCbor = Schema.Tuple([Schema.Literal(1)]);
const StartBatchCbor = Schema.Tuple([Schema.Literal(2)]);
const NoBlocksCbor = Schema.Tuple([Schema.Literal(3)]);
const BlockCbor = Schema.Tuple([Schema.Literal(4), Schema.Uint8Array]);
const BatchDoneCbor = Schema.Tuple([Schema.Literal(5)]);

export const BlockFetchMessageFromCbor = Schema.Union([
    RequestRangeCbor,
    ClientDoneCbor,
    StartBatchCbor,
    NoBlocksCbor,
    BlockCbor,
    BatchDoneCbor,
]).pipe(
    Schema.decodeTo(BlockFetchMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(BlockFetchMessage)(
                tuple[0] === 0
                    ? {
                        _tag: BlockFetchMessageType.RequestRange,
                        from: tuple[1],
                        to: tuple[2],
                    }
                    : tuple[0] === 1
                    ? { _tag: BlockFetchMessageType.ClientDone }
                    : tuple[0] === 2
                    ? { _tag: BlockFetchMessageType.StartBatch }
                    : tuple[0] === 3
                    ? { _tag: BlockFetchMessageType.NoBlocks }
                    : tuple[0] === 4
                    ? { _tag: BlockFetchMessageType.Block, block: tuple[1] }
                    : { _tag: BlockFetchMessageType.BatchDone },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid BlockFetch CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) => {
            switch (msg._tag) {
                case BlockFetchMessageType.RequestRange:
                    return [0, msg.from, msg.to];
                case BlockFetchMessageType.ClientDone:
                    return [1];
                case BlockFetchMessageType.StartBatch:
                    return [2];
                case BlockFetchMessageType.NoBlocks:
                    return [3];
                case BlockFetchMessageType.Block:
                    return [4, msg.block];
                case BlockFetchMessageType.BatchDone:
                    return [5];
            }
        }),
    }),
);

export const BlockFetchMessageBytes = CborBytes(BlockFetchMessageFromCbor);
