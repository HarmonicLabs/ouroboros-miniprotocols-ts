import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

// ── Application-level types ──

export enum ChainPointType {
    Origin = "Origin",
    RealPoint = "RealPoint",
}

export const ChainPointTypeSchema = Schema.Enum(ChainPointType);

export const RealPointSchema = Schema.Struct({
    slot: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
    hash: Schema.Uint8Array,
});

export const ChainPointSchema = Schema.Union([
    Schema.TaggedStruct(ChainPointType.Origin, {}),
    Schema.TaggedStruct(ChainPointType.RealPoint, {
        slot: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
        hash: Schema.Uint8Array,
    }),
]).pipe(Schema.toTaggedUnion("_tag"));

export type ChainPoint = Schema.Schema.Type<typeof ChainPointSchema>;

// ── CBOR wire format ──
// Origin = [] (empty CBOR array)
// RealPoint = [slot, hash] (2-element CBOR array)

const ChainPointOriginCbor = Schema.Tuple([]);
const ChainPointRealCbor = Schema.Tuple([
    Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
    Schema.Uint8Array,
]);

export const ChainPointFromCbor = Schema.Union([
    ChainPointOriginCbor,
    ChainPointRealCbor,
]).pipe(
    Schema.decodeTo(ChainPointSchema, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(ChainPointSchema)(
                tuple.length === 0 ? { _tag: ChainPointType.Origin } : {
                    _tag: ChainPointType.RealPoint,
                    slot: tuple[0],
                    hash: tuple[1],
                },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message:
                            `Invalid ChainPoint CBOR: expected [] or [slot, hash]`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((point) =>
            point._tag === ChainPointType.Origin ? [] : [point.slot, point.hash]
        ),
    }),
);
