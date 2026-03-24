import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";

// ── Application-level types ──

export enum LocalTxSubmitMessageType {
    SubmitTx = "SubmitTx",
    AcceptTx = "AcceptTx",
    RejectTx = "RejectTx",
    Done = "Done",
}

export const LocalTxSubmitMessageTypeSchema = Schema.Enum(
    LocalTxSubmitMessageType,
);

export const LocalTxSubmitMessage = Schema.Union([
    Schema.TaggedStruct(LocalTxSubmitMessageType.SubmitTx, {
        tx: Schema.Uint8Array,
    }),
    Schema.TaggedStruct(LocalTxSubmitMessageType.AcceptTx, {}),
    Schema.TaggedStruct(LocalTxSubmitMessageType.RejectTx, {
        reason: Schema.Uint8Array,
    }),
    Schema.TaggedStruct(LocalTxSubmitMessageType.Done, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type LocalTxSubmitMessageT = Schema.Schema.Type<
    typeof LocalTxSubmitMessage
>;

export type LocalTxSubmitResult =
    | { readonly accepted: true }
    | { readonly accepted: false; readonly reason: Uint8Array };

// ── CBOR wire format ──
// [0, tx]     — SubmitTx
// [1]         — AcceptTx
// [2, reason] — RejectTx
// [3]         — Done

const SubmitTxCbor = Schema.Tuple([Schema.Literal(0), Schema.Uint8Array]);
const AcceptTxCbor = Schema.Tuple([Schema.Literal(1)]);
const RejectTxCbor = Schema.Tuple([Schema.Literal(2), Schema.Uint8Array]);
const DoneCbor = Schema.Tuple([Schema.Literal(3)]);

export const LocalTxSubmitMessageFromCbor = Schema.Union([
    SubmitTxCbor,
    AcceptTxCbor,
    RejectTxCbor,
    DoneCbor,
]).pipe(
    Schema.decodeTo(LocalTxSubmitMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(LocalTxSubmitMessage)(
                tuple[0] === 0
                    ? { _tag: LocalTxSubmitMessageType.SubmitTx, tx: tuple[1] }
                    : tuple[0] === 1
                    ? { _tag: LocalTxSubmitMessageType.AcceptTx }
                    : tuple[0] === 2
                    ? {
                        _tag: LocalTxSubmitMessageType.RejectTx,
                        reason: tuple[1],
                    }
                    : { _tag: LocalTxSubmitMessageType.Done },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid LocalTxSubmit CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) =>
            msg._tag === LocalTxSubmitMessageType.SubmitTx
                ? [0, msg.tx]
                : msg._tag === LocalTxSubmitMessageType.AcceptTx
                ? [1]
                : msg._tag === LocalTxSubmitMessageType.RejectTx
                ? [2, msg.reason]
                : [3]
        ),
    }),
);

export const LocalTxSubmitMessageBytes = CborBytes(
    LocalTxSubmitMessageFromCbor,
);
