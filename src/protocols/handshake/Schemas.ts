import { MultiplexerProtocolTypeSchema } from "@/multiplexer";
import { Effect, Equivalence, Option, Schema, SchemaGetter, SchemaIssue } from "effect";

import "lodash";

// Base types from current implementation
// VersionNumber uses bit masking: 0x7FFF for node-to-node, 0x8000+ for node-to-client
export const VersionNumber = Schema.Number.check(
  Schema.isGreaterThanOrEqualTo(0),
);
export const NetworkMagic = Schema.Number.check(
  Schema.isGreaterThanOrEqualTo(0),
);
export const Query = Schema.Boolean;
export const InitiatorOnlyDiffusionMode = Schema.Boolean;
export const PeerSharing = Schema.Boolean;

// Node-to-node version data (current implementation)
export const NodeToNodeVersionDataSchema = Schema.Struct({
  networkMagic: NetworkMagic,
  initiatorOnlyDiffusionMode: InitiatorOnlyDiffusionMode,
  peerSharing: PeerSharing,
  query: Query,
});

// Node-to-client version data (current implementation)
export const NodeToClientVersionDataSchema = Schema.Struct({
  networkMagic: NetworkMagic,
  query: Query,
});

export const VersionTableSchema = Schema.Union([
  Schema.TaggedStruct(MultiplexerProtocolTypeSchema.enums.NodeToNode, { data: Schema.Record(VersionNumber, NodeToNodeVersionDataSchema) }),
  Schema.TaggedStruct(MultiplexerProtocolTypeSchema.enums.NodeToClient, { data: Schema.Record(VersionNumber, NodeToClientVersionDataSchema) }),
]).pipe(Schema.toTaggedUnion("_tag"))

export enum RefuseReasonType {
  VersionMismatch,
  HandshakeDecodeError,
  Refused,
}

export const RefuseReasonTypeSchema = Schema.Enum(RefuseReasonType);

// Refuse reasons (following current implementation and CDDL spec)
export const RefuseReasonSchema = Schema.Union([
  Schema.TaggedStruct(
    RefuseReasonType.VersionMismatch,
    {
      validVersions: Schema.Array(VersionNumber), // matches current implementation
    },
  ),
  Schema.TaggedStruct(
    RefuseReasonType.HandshakeDecodeError,
    {
      version: VersionNumber,
      message: Schema.String,
    },
  ),
  Schema.TaggedStruct(RefuseReasonType.Refused, {
    version: VersionNumber,
    message: Schema.String,
  }),
]).pipe(Schema.toTaggedUnion("_tag"));

export const RefuseReasonFromCbor = Schema.Union([
  Schema.Tuple([Schema.Literal(0), Schema.Array(VersionNumber)]),
  Schema.Tuple([Schema.Literal(1), VersionNumber, Schema.String]),
  Schema.Tuple([Schema.Literal(2), VersionNumber, Schema.String])
]).pipe(
  Schema.decodeTo(RefuseReasonSchema, {
    decode: SchemaGetter.transformOrFail(
      (tuple) =>
        Schema.decodeUnknownEffect(RefuseReasonSchema)(
          tuple[0] === 0 ?
            { _tag: RefuseReasonType.VersionMismatch, validVersions: tuple[1] } :
            tuple[0] === 1 ?
              { _tag: RefuseReasonType.HandshakeDecodeError, version: tuple[1], message: tuple[2] } :
              tuple[0] === 2 ?
                { _tag: RefuseReasonType.Refused, version: tuple[1], message: tuple[2] } : undefined
        ).pipe(Effect.mapError((_e) => new SchemaIssue.InvalidValue(Option.some(tuple), { message: `Invalid refuse reason: ${tuple[0]}` })))
    ),
    encode: SchemaGetter.transform((reason) =>
      reason._tag === RefuseReasonType.VersionMismatch ?
        [reason._tag, reason.validVersions] :
        [reason._tag, reason.version, reason.message]
    )
  })
);

// Handshake messages (following current implementation structure)

export enum HandshakeMessageType {
  MsgProposeVersions,
  MsgAcceptVersion,
  MsgRefuse,
  MsgQueryReply
}

export const HandshakeMessageTypeSchema = Schema.Enum(HandshakeMessageType);

// Tagged union versions (for application logic)
export const HandshakeMessage = Schema.Union([
  Schema.TaggedStruct(
    HandshakeMessageType.MsgProposeVersions,
    {
      versionTable: VersionTableSchema
    },
  ),
  Schema.TaggedStruct(HandshakeMessageType.MsgAcceptVersion, {
    version: VersionNumber,
    versionData: Schema.Union([NodeToNodeVersionDataSchema, NodeToClientVersionDataSchema]),
  }),
  Schema.TaggedStruct(HandshakeMessageType.MsgRefuse, {
    reason: RefuseReasonSchema,
  }),
  Schema.TaggedStruct(HandshakeMessageType.MsgQueryReply, {
    versionTable: VersionTableSchema.check(Schema.makeFilter(({ _tag }) => Equivalence.String(_tag, MultiplexerProtocolTypeSchema.enums.NodeToClient))),
  }),
]).pipe(Schema.toTaggedUnion("_tag"));

// CDDL-compatible versions (for CBOR encoding/decoding)
export const HandshakeProposeVersionsCbor = Schema.Tuple([
  Schema.Literal(0),
  VersionTableSchema
]);

const HandshakeAcceptVersionCbor = Schema.Tuple([
  Schema.Literal(1),
  VersionNumber,
  Schema.Union([NodeToNodeVersionDataSchema, NodeToClientVersionDataSchema]),
]);

const HandshakeRefuseCbor = Schema.Tuple([
  Schema.Literal(2),
  RefuseReasonFromCbor,
]);

const HandshakeQueryReplyCbor = Schema.Tuple([
  Schema.Literal(3),
  VersionTableSchema.check(Schema.makeFilter(({ _tag }) => Equivalence.String(_tag, MultiplexerProtocolTypeSchema.enums.NodeToClient))),
]);

// CBOR-encoded message union
export const HandshakeMessageFromCbor = Schema.Union([
  HandshakeProposeVersionsCbor,
  HandshakeAcceptVersionCbor,
  HandshakeRefuseCbor,
  HandshakeQueryReplyCbor,
]).pipe(
  Schema.decodeTo(HandshakeMessage, {     
    decode: SchemaGetter.transformOrFail(
      (tuple) =>
        Schema.decodeUnknownEffect(HandshakeMessage)(
          tuple[0] === 0 ?
            { _tag: HandshakeMessageType.MsgProposeVersions, versionTable: tuple[1] } :
            tuple[0] === 1 ?
              { _tag: HandshakeMessageType.MsgAcceptVersion, version: tuple[1], versionData: tuple[2] } :
              tuple[0] === 2 ?
                { _tag: HandshakeMessageType.MsgRefuse, reason: tuple[1] } :
                tuple[0] === 3 ?
                  { _tag: HandshakeMessageType.MsgQueryReply, versionTable: tuple[1] } :
                  undefined
        ).pipe(Effect.mapError((_e) => new SchemaIssue.InvalidValue(Option.some(tuple), { message: `Invalid refuse reason: ${tuple[0]}` })))
    ),
    encode: SchemaGetter.transform(
      (data) =>
        data._tag === HandshakeMessageType.MsgProposeVersions ?
          [data._tag, data.versionTable] :
          data._tag === HandshakeMessageType.MsgAcceptVersion ?
            [data._tag, data.version, data.versionData] :
            data._tag === HandshakeMessageType.MsgRefuse ?
              [data._tag, data.reason] :
              [data._tag, data.versionTable]
    )
  })
);
