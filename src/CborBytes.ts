import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";
import {
    Cbor,
    CborArray,
    CborBytes as CborBytesObj,
    CborMap,
    CborNegInt,
    CborObj,
    CborSimple,
    CborTag,
    CborText,
    CborUInt,
} from "@harmoniclabs/cbor";

// ── Error types ──

export class CborDecodeError
    extends Schema.TaggedErrorClass<CborDecodeError>()("CborDecodeError", {
        cause: Schema.Defect,
    }) {}

export class CborEncodeError
    extends Schema.TaggedErrorClass<CborEncodeError>()("CborEncodeError", {
        cause: Schema.Defect,
    }) {}

// ── CborObj ↔ JS conversion ──

/**
 * Recursively converts a CborObj tree to plain JS values
 * (arrays, numbers, strings, Uint8Arrays, booleans, Maps)
 */
export const cborToJs = (obj: CborObj): unknown => {
    if (obj instanceof CborUInt) return Number(obj.num);
    if (obj instanceof CborNegInt) return -Number(obj.num) - 1;
    if (obj instanceof CborBytesObj) return obj.bytes;
    if (obj instanceof CborText) return obj.text;
    if (obj instanceof CborArray) return obj.array.map(cborToJs);
    if (obj instanceof CborMap) {
        return Object.fromEntries(
            obj.map.map(({ k, v }) => [cborToJs(k), cborToJs(v)]),
        );
    }
    if (obj instanceof CborTag) return cborToJs(obj.data);
    if (obj instanceof CborSimple) return obj.simple;
    return obj;
};

/**
 * Recursively converts plain JS values to a CborObj tree
 */
export const jsToCbor = (value: unknown): CborObj => {
    if (typeof value === "number") {
        return value >= 0 ? new CborUInt(value) : new CborNegInt(-value - 1);
    }
    if (typeof value === "bigint") {
        return value >= 0n ? new CborUInt(value) : new CborNegInt(-value - 1n);
    }
    if (typeof value === "string") return new CborText(value);
    if (typeof value === "boolean") {
        return value ? CborSimple.true : CborSimple.false;
    }
    if (value === null || value === undefined) return CborSimple.null;
    if (value instanceof Uint8Array) return new CborBytesObj(value);
    if (Array.isArray(value)) return new CborArray(value.map(jsToCbor));
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);
        return new CborMap(
            entries.map(([k, v]) => ({
                // JS object keys are always strings; detect numeric keys and encode as CBOR uint
                k: /^\d+$/.test(k)
                    ? new CborUInt(parseInt(k, 10))
                    : jsToCbor(k),
                v: jsToCbor(v),
            })),
        );
    }
    return CborSimple.null;
};

// ── CborBytes schema utility ──

/**
 * Creates a Schema that transforms Uint8Array ↔ ApplicationType
 * by composing: Uint8Array ↔ CborObj ↔ JS primitives ↔ ApplicationType (via cborSchema)
 *
 * @param cborSchema - A Schema whose Encoded type accepts JS-primitive representations
 *                     of CBOR data (arrays, numbers, strings, Uint8Arrays)
 */
export const CborBytes = <S extends Schema.Top>(cborSchema: S) =>
    Schema.Uint8Array.pipe(
        Schema.decodeTo(cborSchema, {
            // Uint8Array → cborSchema.Encoded (JS primitives from CBOR parse)
            // The compose chain then applies cborSchema's own decode to reach cborSchema.Type
            decode: SchemaGetter.transformOrFail((bytes: Uint8Array) =>
                Effect.try({
                    try: () => Cbor.parse(bytes),
                    catch: (e) => new CborDecodeError({ cause: e }),
                }).pipe(
                    Effect.map(cborToJs),
                    Effect.mapError((e) =>
                        new SchemaIssue.InvalidValue(Option.none(), {
                            message: `CBOR decode failed: ${e}`,
                        })
                    ),
                )
            ),
            // cborSchema.Encoded (JS primitives) → Uint8Array (CBOR encode)
            // The compose chain already encoded from cborSchema.Type to cborSchema.Encoded
            encode: SchemaGetter.transformOrFail((encoded) =>
                Effect.try({
                    try: () => Cbor.encode(jsToCbor(encoded)).toBuffer(),
                    catch: (e) => new CborEncodeError({ cause: e }),
                }).pipe(
                    Effect.mapError((e) =>
                        new SchemaIssue.InvalidValue(Option.none(), {
                            message: `CBOR encode failed: ${e}`,
                        })
                    ),
                )
            ),
        }),
    );
