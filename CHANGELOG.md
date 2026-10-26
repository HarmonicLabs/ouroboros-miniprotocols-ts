# Changelog

## 0.0.6-dev0

New version line, published next to npm 0.0.5-dev7, never over it: 0.0.5-dev7 contains a handshake n2c/n2n split,
`NetworkMagic` and `TxSubmitReplyTx` that are on no GitHub branch, and this line does not have them.

- `@harmoniclabs/cbor` 2.x in every message class.
- LocalTxSubmit `MsgSubmitTx` and TxMonitor `ReplyNextTx` carry the era-wrapped transaction
  (`[era, #6.24(bytes)]`); TxMonitor message indices match the spec (`docs/BUG_*`).
- Peer sharing: IPv6 peer addresses decode correctly.
- `HandshakeServer` (from the Gerolamo node); `HandshakeClient.propose()` rejects on a multiplexer error.
