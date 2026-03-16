import { Schema } from "effect"

// Base types from current implementation
// VersionNumber uses bit masking: 0x7FFF for node-to-node, 0x8000+ for node-to-client
export const VersionNumber = Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))
export const NetworkMagic = Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))
export const Query = Schema.Boolean
export const InitiatorOnlyDiffusionMode = Schema.Boolean
export const PeerSharing = Schema.Boolean

// Node-to-node version data (current implementation)
export const NodeToNodeVersionData = Schema.Struct({
  networkMagic: NetworkMagic,
  initiatorOnlyDiffusionMode: InitiatorOnlyDiffusionMode,
  peerSharing: PeerSharing,
  query: Query
})

// Node-to-client version data (current implementation)
export const NodeToClientVersionData = Schema.Struct({
  networkMagic: NetworkMagic,
  query: Query
})

// Version table types (maps from version number to version data)
export const NodeToNodeVersionTable = Schema.Record(VersionNumber, NodeToNodeVersionData)
export const NodeToClientVersionTable = Schema.Record(VersionNumber, NodeToClientVersionData)

// Refuse reasons (following current implementation and CDDL spec)
export const RefuseReasonVersionMismatch = Schema.TaggedStruct("VersionMismatch", {
  validVersions: Schema.Array(VersionNumber)  // matches current implementation
})

export const RefuseReasonHandshakeDecodeError = Schema.TaggedStruct("HandshakeDecodeError", {
  version: VersionNumber,
  message: Schema.String
})

export const RefuseReasonRefused = Schema.TaggedStruct("Refused", {
  version: VersionNumber,
  message: Schema.String
})

export const RefuseReason = Schema.Union([
  RefuseReasonVersionMismatch,
  RefuseReasonHandshakeDecodeError,
  RefuseReasonRefused
])

// CDDL-encoded versions (for actual CBOR transmission)
export const RefuseReasonVersionMismatchCbor = Schema.Tuple([
  Schema.Literal(0),
  Schema.Array(VersionNumber)
])

export const RefuseReasonHandshakeDecodeErrorCbor = Schema.Tuple([
  Schema.Literal(1),
  VersionNumber,
  Schema.String
])

export const RefuseReasonRefusedCbor = Schema.Tuple([
  Schema.Literal(2),
  VersionNumber,
  Schema.String
])

// Handshake messages (following current implementation structure)

// Tagged union versions (for application logic)
export const HandshakeProposeVersions = Schema.TaggedStruct("MsgProposeVersions", {
  versionTable: Schema.Union([NodeToNodeVersionTable, NodeToClientVersionTable])
})

export const HandshakeAcceptVersion = Schema.TaggedStruct("MsgAcceptVersion", {
  version: VersionNumber,
  versionData: Schema.Union([NodeToNodeVersionData, NodeToClientVersionData])
})

export const HandshakeRefuse = Schema.TaggedStruct("MsgRefuse", {
  reason: RefuseReason
})

export const HandshakeQueryReply = Schema.TaggedStruct("MsgQueryReply", {
  versionTable: NodeToClientVersionTable
})

// Union of all handshake messages (tagged)
export const HandshakeMessage = Schema.Union([
  HandshakeProposeVersions,
  HandshakeAcceptVersion,
  HandshakeRefuse,
  HandshakeQueryReply
])

// CDDL-compatible versions (for CBOR encoding/decoding)
export const HandshakeProposeVersionsCbor = Schema.Tuple([
  Schema.Literal(0),
  Schema.Union([NodeToNodeVersionTable, NodeToClientVersionTable])
])

export const HandshakeAcceptVersionCbor = Schema.Tuple([
  Schema.Literal(1),
  VersionNumber,
  Schema.Union([NodeToNodeVersionData, NodeToClientVersionData])
])

export const HandshakeRefuseCbor = Schema.Tuple([
  Schema.Literal(2),
  Schema.Union([
    RefuseReasonVersionMismatchCbor,
    RefuseReasonHandshakeDecodeErrorCbor,
    RefuseReasonRefusedCbor
  ])
])

export const HandshakeQueryReplyCbor = Schema.Tuple([
  Schema.Literal(3),
  NodeToClientVersionTable
])

// CBOR-encoded message union
export const HandshakeMessageCbor = Schema.Union([
  HandshakeProposeVersionsCbor,
  HandshakeAcceptVersionCbor,
  HandshakeRefuseCbor,
  HandshakeQueryReplyCbor
])
