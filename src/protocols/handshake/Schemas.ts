import { MultiplexerProtocolTypeSchema } from "@/multiplexer";
import {
    Effect,
    Equivalence,
    Option,
    Schema,
    SchemaGetter,
    SchemaIssue,
} from "effect";

import { CborBytes } from "../../CborBytes";

// Base types
export const VersionNumber = Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0),
);
export const NetworkMagic = Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0),
);
export const Query = Schema.Boolean;
export const InitiatorOnlyDiffusionMode = Schema.Boolean;
// peerSharing is 0 | 1 | 2 per CDDL spec (not a boolean)
export const PeerSharing = Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(2),
);

// Node-to-node version data (application type)
export const NodeToNodeVersionDataSchema = Schema.Struct({
    networkMagic: NetworkMagic,
    initiatorOnlyDiffusionMode: InitiatorOnlyDiffusionMode,
    peerSharing: PeerSharing,
    query: Query,
});

// Node-to-client version data (application type)
export const NodeToClientVersionDataSchema = Schema.Struct({
    networkMagic: NetworkMagic,
    query: Query,
});

export const VersionTableSchema = Schema.Union([
    Schema.TaggedStruct(MultiplexerProtocolTypeSchema.enums.NodeToNode, {
        data: Schema.Record(VersionNumber, NodeToNodeVersionDataSchema),
    }),
    Schema.TaggedStruct(MultiplexerProtocolTypeSchema.enums.NodeToClient, {
        data: Schema.Record(VersionNumber, NodeToClientVersionDataSchema),
    }),
]).pipe(Schema.toTaggedUnion("_tag"));

export enum RefuseReasonType {
    VersionMismatch,
    HandshakeDecodeError,
    Refused,
}

export const RefuseReasonTypeSchema = Schema.Enum(RefuseReasonType);

export const RefuseReasonSchema = Schema.Union([
    Schema.TaggedStruct(RefuseReasonType.VersionMismatch, {
        validVersions: Schema.Array(VersionNumber),
    }),
    Schema.TaggedStruct(RefuseReasonType.HandshakeDecodeError, {
        version: VersionNumber,
        message: Schema.String,
    }),
    Schema.TaggedStruct(RefuseReasonType.Refused, {
        version: VersionNumber,
        message: Schema.String,
    }),
]).pipe(Schema.toTaggedUnion("_tag"));

export const RefuseReasonFromCbor = Schema.Union([
    Schema.Tuple([Schema.Literal(0), Schema.Array(VersionNumber)]),
    Schema.Tuple([Schema.Literal(1), VersionNumber, Schema.String]),
    Schema.Tuple([Schema.Literal(2), VersionNumber, Schema.String]),
]).pipe(
    Schema.decodeTo(RefuseReasonSchema, {
        decode: SchemaGetter.transformOrFail(
            (tuple) =>
                Schema.decodeUnknownEffect(RefuseReasonSchema)(
                    tuple[0] === 0
                        ? {
                            _tag: RefuseReasonType.VersionMismatch,
                            validVersions: tuple[1],
                        }
                        : tuple[0] === 1
                        ? {
                            _tag: RefuseReasonType.HandshakeDecodeError,
                            version: tuple[1],
                            message: tuple[2],
                        }
                        : {
                            _tag: RefuseReasonType.Refused,
                            version: tuple[1],
                            message: tuple[2],
                        },
                ).pipe(
                    Effect.mapError((_e) =>
                        new SchemaIssue.InvalidValue(Option.some(tuple), {
                            message: `Invalid refuse reason: ${tuple[0]}`,
                        })
                    ),
                ),
        ),
        encode: SchemaGetter.transform((reason) =>
            reason._tag === RefuseReasonType.VersionMismatch
                ? [reason._tag, reason.validVersions]
                : [reason._tag, reason.version, reason.message]
        ),
    }),
);

export enum HandshakeMessageType {
    MsgProposeVersions,
    MsgAcceptVersion,
    MsgRefuse,
    MsgQueryReply,
}

export const HandshakeMessageTypeSchema = Schema.Enum(HandshakeMessageType);

// Tagged union versions (for application logic)
export const HandshakeMessage = Schema.Union([
    Schema.TaggedStruct(HandshakeMessageType.MsgProposeVersions, {
        versionTable: VersionTableSchema,
    }),
    Schema.TaggedStruct(HandshakeMessageType.MsgAcceptVersion, {
        version: VersionNumber,
        versionData: Schema.Union([
            NodeToNodeVersionDataSchema,
            NodeToClientVersionDataSchema,
        ]),
    }),
    Schema.TaggedStruct(HandshakeMessageType.MsgRefuse, {
        reason: RefuseReasonSchema,
    }),
    Schema.TaggedStruct(HandshakeMessageType.MsgQueryReply, {
        versionTable: VersionTableSchema.check(
            Schema.makeFilter(({ _tag }) =>
                Equivalence.String(
                    _tag,
                    MultiplexerProtocolTypeSchema.enums.NodeToClient,
                )
            ),
        ),
    }),
]).pipe(Schema.toTaggedUnion("_tag"));

// ── CBOR ↔ Application conversion helpers ──

// VersionTable: application { _tag, data: { ver: structFields } } ↔ CBOR { ver: [fields...] }
const versionTableToCbor = (vt: VersionTable): Record<number, unknown[]> => {
    const result: Record<number, unknown[]> = {};
    for (const [ver, vData] of Object.entries(vt.data)) {
        result[parseInt(ver, 10)] =
            vt._tag === MultiplexerProtocolTypeSchema.enums.NodeToNode
                ? [
                    (vData as NodeToNodeVersionData).networkMagic,
                    (vData as NodeToNodeVersionData).initiatorOnlyDiffusionMode,
                    (vData as NodeToNodeVersionData).peerSharing,
                    (vData as NodeToNodeVersionData).query,
                ]
                : [
                    (vData as NodeToClientVersionData).networkMagic,
                    (vData as NodeToClientVersionData).query,
                ];
    }
    return result;
};

// CBOR { ver: [fields...] } → application { _tag, data: { ver: structFields } }
const versionTableFromCbor = (map: Record<string, unknown[]>): VersionTable => {
    const entries = Object.entries(map);
    if (entries.length === 0) {
        return {
            _tag: MultiplexerProtocolTypeSchema.enums.NodeToNode,
            data: {},
        };
    }
    const firstData = entries[0]![1];
    const isN2N = Array.isArray(firstData) && firstData.length === 4;
    const data: Record<
        number,
        NodeToNodeVersionData | NodeToClientVersionData
    > = {};
    for (const [ver, vData] of entries) {
        const arr = vData as unknown[];
        data[parseInt(ver, 10)] = isN2N
            ? {
                networkMagic: arr[0] as number,
                initiatorOnlyDiffusionMode: arr[1] as boolean,
                peerSharing: arr[2] as number,
                query: arr[3] as boolean,
            }
            : { networkMagic: arr[0] as number, query: arr[1] as boolean };
    }
    return isN2N
        ? { _tag: MultiplexerProtocolTypeSchema.enums.NodeToNode, data }
        : { _tag: MultiplexerProtocolTypeSchema.enums.NodeToClient, data };
};

// VersionData: application struct ↔ CBOR array [fields...]
const versionDataToCbor = (
    vd: NodeToNodeVersionData | NodeToClientVersionData,
): unknown[] =>
    "peerSharing" in vd
        ? [
            vd.networkMagic,
            vd.initiatorOnlyDiffusionMode,
            vd.peerSharing,
            vd.query,
        ]
        : [vd.networkMagic, vd.query];

const versionDataFromCbor = (
    arr: unknown[],
): NodeToNodeVersionData | NodeToClientVersionData =>
    arr.length === 4
        ? {
            networkMagic: arr[0] as number,
            initiatorOnlyDiffusionMode: arr[1] as boolean,
            peerSharing: arr[2] as number,
            query: arr[3] as boolean,
        }
        : { networkMagic: arr[0] as number, query: arr[1] as boolean };

// ── CBOR-level schemas (raw tuple/map forms, no Schema transforms — just structural) ──

// The decodeTo transforms below do ALL the CBOR ↔ application conversion.
// The CBOR union is structurally: [msgIdx, ...fields]
// where fields are plain JS values (integers, arrays, maps with integer keys).

export const HandshakeMessageFromCbor = Schema.Unknown.pipe(
    Schema.decodeTo(HandshakeMessage, {
        decode: SchemaGetter.transformOrFail((raw) => {
            const tuple = raw as unknown[];
            const msgIdx = tuple[0] as number;
            return Schema.decodeUnknownEffect(HandshakeMessage)(
                msgIdx === 0
                    ? {
                        _tag: HandshakeMessageType.MsgProposeVersions,
                        versionTable: versionTableFromCbor(
                            tuple[1] as Record<string, unknown[]>,
                        ),
                    }
                    : msgIdx === 1
                    ? {
                        _tag: HandshakeMessageType.MsgAcceptVersion,
                        version: tuple[1],
                        versionData: versionDataFromCbor(tuple[2] as unknown[]),
                    }
                    : msgIdx === 2
                    ? {
                        _tag: HandshakeMessageType.MsgRefuse,
                        reason: (() => {
                            const r = tuple[1] as unknown[];
                            return r[0] === 0
                                ? {
                                    _tag: RefuseReasonType.VersionMismatch,
                                    validVersions: r[1],
                                }
                                : r[0] === 1
                                ? {
                                    _tag: RefuseReasonType.HandshakeDecodeError,
                                    version: r[1],
                                    message: r[2],
                                }
                                : {
                                    _tag: RefuseReasonType.Refused,
                                    version: r[1],
                                    message: r[2],
                                };
                        })(),
                    }
                    : {
                        _tag: HandshakeMessageType.MsgQueryReply,
                        versionTable: versionTableFromCbor(
                            tuple[1] as Record<string, unknown[]>,
                        ),
                    },
            ).pipe(
                Effect.mapError((_e) =>
                    new SchemaIssue.InvalidValue(Option.some(raw), {
                        message: `Invalid handshake message: ${tuple[0]}`,
                    })
                ),
            );
        }),
        encode: SchemaGetter.transform((data) => {
            switch (data._tag) {
                case HandshakeMessageType.MsgProposeVersions:
                    return [0, versionTableToCbor(data.versionTable)];
                case HandshakeMessageType.MsgAcceptVersion:
                    return [
                        1,
                        data.version,
                        versionDataToCbor(data.versionData),
                    ];
                case HandshakeMessageType.MsgRefuse:
                    return data.reason._tag === RefuseReasonType.VersionMismatch
                        ? [2, [data.reason._tag, data.reason.validVersions]]
                        : [2, [
                            data.reason._tag,
                            data.reason.version,
                            data.reason.message,
                        ]];
                case HandshakeMessageType.MsgQueryReply:
                    return [3, versionTableToCbor(data.versionTable)];
            }
        }),
    }),
);

// Full Uint8Array ↔ HandshakeMessage schema via CBOR
export const HandshakeMessageBytes = CborBytes(HandshakeMessageFromCbor);

// ── Derived type aliases for consumers ──

export type NodeToNodeVersionData = Schema.Schema.Type<
    typeof NodeToNodeVersionDataSchema
>;
export type NodeToClientVersionData = Schema.Schema.Type<
    typeof NodeToClientVersionDataSchema
>;
export type VersionTable = Schema.Schema.Type<typeof VersionTableSchema>;
export type RefuseReason = Schema.Schema.Type<typeof RefuseReasonSchema>;
export type HandshakeMessageT = Schema.Schema.Type<typeof HandshakeMessage>;
