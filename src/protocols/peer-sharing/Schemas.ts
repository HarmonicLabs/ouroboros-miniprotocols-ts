import { Effect, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import { CborBytes } from "../../CborBytes";

// ── PeerAddress types ──
// IPv4 = [0, bytes4, port]
// IPv6 = [1, bytes16, port]

export enum PeerAddressType {
    IPv4 = "IPv4",
    IPv6 = "IPv6",
}

export const PeerAddressSchema = Schema.Union([
    Schema.TaggedStruct(PeerAddressType.IPv4, {
        addr: Schema.Uint8Array,
        port: Schema.Number,
    }),
    Schema.TaggedStruct(PeerAddressType.IPv6, {
        addr: Schema.Uint8Array,
        port: Schema.Number,
    }),
]).pipe(Schema.toTaggedUnion("_tag"));

export type PeerAddress = Schema.Schema.Type<typeof PeerAddressSchema>;

const PeerAddressIPv4Cbor = Schema.Tuple([
    Schema.Literal(0),
    Schema.Uint8Array,
    Schema.Number,
]);
const PeerAddressIPv6Cbor = Schema.Tuple([
    Schema.Literal(1),
    Schema.Uint8Array,
    Schema.Number,
]);

export const PeerAddressFromCbor = Schema.Union([
    PeerAddressIPv4Cbor,
    PeerAddressIPv6Cbor,
]).pipe(
    Schema.decodeTo(PeerAddressSchema, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(PeerAddressSchema)(
                tuple[0] === 0
                    ? {
                        _tag: PeerAddressType.IPv4,
                        addr: tuple[1],
                        port: tuple[2],
                    }
                    : {
                        _tag: PeerAddressType.IPv6,
                        addr: tuple[1],
                        port: tuple[2],
                    },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid PeerAddress CBOR`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((addr) =>
            addr._tag === PeerAddressType.IPv4
                ? [0, addr.addr, addr.port]
                : [1, addr.addr, addr.port]
        ),
    }),
);

// ── PeerSharing messages ──

export enum PeerSharingMessageType {
    ShareRequest = "ShareRequest",
    SharePeers = "SharePeers",
    Done = "Done",
}

export const PeerSharingMessageTypeSchema = Schema.Enum(PeerSharingMessageType);

export const PeerSharingMessage = Schema.Union([
    Schema.TaggedStruct(PeerSharingMessageType.ShareRequest, {
        amount: Schema.Number,
    }),
    Schema.TaggedStruct(PeerSharingMessageType.SharePeers, {
        peers: Schema.Array(PeerAddressSchema),
    }),
    Schema.TaggedStruct(PeerSharingMessageType.Done, {}),
]).pipe(Schema.toTaggedUnion("_tag"));

export type PeerSharingMessageT = Schema.Schema.Type<typeof PeerSharingMessage>;

// ── CBOR wire format ──
// [0, amount]           — ShareRequest
// [1, [peerAddress*]]   — SharePeers
// [2]                   — Done

const ShareRequestCbor = Schema.Tuple([Schema.Literal(0), Schema.Number]);
const SharePeersCbor = Schema.Tuple([
    Schema.Literal(1),
    Schema.Array(PeerAddressFromCbor),
]);
const DoneCbor = Schema.Tuple([Schema.Literal(2)]);

export const PeerSharingMessageFromCbor = Schema.Union([
    ShareRequestCbor,
    SharePeersCbor,
    DoneCbor,
]).pipe(
    Schema.decodeTo(PeerSharingMessage, {
        decode: SchemaGetter.transformOrFail((tuple) =>
            Schema.decodeUnknownEffect(PeerSharingMessage)(
                tuple[0] === 0
                    ? {
                        _tag: PeerSharingMessageType.ShareRequest,
                        amount: tuple[1],
                    }
                    : tuple[0] === 1
                    ? {
                        _tag: PeerSharingMessageType.SharePeers,
                        peers: tuple[1],
                    }
                    : { _tag: PeerSharingMessageType.Done },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(tuple), {
                        message: `Invalid PeerSharing CBOR: ${tuple[0]}`,
                    })
                ),
            )
        ),
        encode: SchemaGetter.transform((msg) =>
            msg._tag === PeerSharingMessageType.ShareRequest
                ? [0, msg.amount]
                : msg._tag === PeerSharingMessageType.SharePeers
                ? [1, msg.peers]
                : [2]
        ),
    }),
);

export const PeerSharingMessageBytes = CborBytes(PeerSharingMessageFromCbor);
