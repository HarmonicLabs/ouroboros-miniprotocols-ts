import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";
import { ChainPointFromCbor, ChainPointSchema } from "./ChainPoint";

// ── Application-level type ──

export const ChainTipSchema = Schema.Struct({
    point: ChainPointSchema,
    blockNo: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
});

export type ChainTip = Schema.Schema.Type<typeof ChainTipSchema>;

// ── CBOR wire format ──
// tip = [point, blockNo] where point is [] or [slot, hash]

export const ChainTipFromCbor = Schema.Tuple([
    ChainPointFromCbor,
    Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
]).pipe(
    Schema.decodeTo(ChainTipSchema, {
        decode: SchemaGetter.transformOrFail(
            (tuple) =>
                Schema.decodeUnknownEffect(ChainTipSchema)({
                    point: tuple[0],
                    blockNo: tuple[1],
                }).pipe(
                    Effect.mapError((_e) =>
                        new SchemaIssue.InvalidValue(Option.some(tuple), {
                            message: `Invalid ChainTip CBOR`,
                        })
                    ),
                ),
        ),
        encode: SchemaGetter.transform((tip) => [tip.point, tip.blockNo]),
    }),
);
