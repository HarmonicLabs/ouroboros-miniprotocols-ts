# BUG #3: `TxMonitorReplyNextTx` rejects era-wrapped txs — kills the connection when the mempool is non-empty

**Status:** FIXED in `0.0.5-dev10` (found 2026-08-05, root cause of the "submit kills other connections" anomaly)
**Affects:** every version through `0.0.5-dev9`
**Severity:** `TxMonitorClient.nextTx()` works ONLY on an empty mempool. The moment the
mempool contains a real transaction, parsing the reply throws, the exception is routed into
the multiplexer's generic error path, and the whole connection dies. This is the READ-side
mirror of the `LocalTxSubmitSubmit` era-wrapping bug fixed in dev9.

## The bug

**`src/protocols/local-tx-monitor/messages/TxMonitorReplyNextTx.ts:70-75`**
```ts
if( cbor.array[1] )
{
    if(!( cbor.array[1] instanceof CborBytes ))   // ← node sends an ARRAY, not bytes
        throw new Error("invalid CBOR for 'TxMonitorReplyNextTx");
    reply.tx = cbor.array[1].bytes;
}
```

Per the spec, a non-empty `MsgReplyNextTx` carries the transaction **era-wrapped**:

```
msgReplyNextTx = [6]                          ; mempool exhausted
              / [6, [era, #6.24(txBytes)]]    ; next tx (era 6 = Conway)
```

The parser only accepts a plain byte string, so any real tx reply throws. The encoder
(`toCborObj`, line 46) has the same omission (`arr.push(new CborBytes(this.tx))`), which
matters for the server half / round-trips.

## How it presented (why it looked like a submit bug)

- All TxMonitor smoke tests pass on an **empty** mempool (`[6]` parses fine).
- The instant ANY submission is accepted (raw n2c or via `cardano-submit-api`), every
  client currently draining `nextTx()` hits the throw and its connection dies with a
  generic `Error: socket error` — observed 6/6 times across processes, initially
  misattributed to the submission path.
- Diagnosed by dumping `err.data` on the multiplexer error (the real exception is stashed
  there): it contained this parser's source frames.

## Suggested fix

In `fromCborObj`: accept the era-wrapped array and expose BOTH the era and the raw inner
tx bytes; keep accepting plain `CborBytes` for compatibility:

```ts
const item = cbor.array[1];
if ( item instanceof CborBytes ) reply.tx = item.bytes;
else if (
    item instanceof CborArray &&
    item.array[0] instanceof CborUInt &&
    item.array[1] instanceof CborTag &&
    item.array[1].data instanceof CborBytes
) {
    reply.era = Number( item.array[0].num );
    reply.tx = item.array[1].data.bytes;      // unwrapped tx cbor
}
else throw new Error("invalid CBOR for 'TxMonitorReplyNextTx");
```

Mirror in `toCborObj` (emit `[6, [era, CborTag(24, CborBytes(tx))]]`, era defaulting like
`LocalTxSubmitSubmit.DEFAULT_TX_SUBMIT_ERA`).

**Consumer note:** gravity-backend's `parseMempoolTx` already handles BOTH raw tx bytes
and era-wrapped input, so either reply shape works downstream once the parser stops
throwing.

## Also worth fixing while in here

`Multiplexer.handleSocketError` labels EVERY failure — including downstream parse
exceptions like this one — as `Error: socket error`, hiding the cause in an undocumented
`err.data` field. That misdirection cost most of the diagnosis time. Suggest
`new Error("socket error", { cause })` and/or not tearing the connection down on a
message-parse failure at all (a bad message ≠ a dead socket).

## Verification once fixed

1. `bun gravity-backend/scripts/testMempoolSocket.ts` (CYCLES=45) against a node socket.
2. While it runs: `bun gravity-sdk/gravity-testing/agent-test-harness/justSubmitHttp.ts`
   (or `justSubmitLocal.ts`).
3. Expect the watcher to print `SIGHTED`/non-zero `mempool txs` at the submit moment and
   keep cycling — no socket error. That also completes the full
   submit → mempool → drain → parse → inclusion E2E for the gravity ws feature.

---

# dev10 VERIFICATION (2026-08-05): FULL E2E GREEN

All three era/encoding fixes verified together against a live preprod node:
- unit: `TxMonitorReplyNextTx.fromCbor([6,[6,#6.24(tx)]])` extracts the tx ✅;
  acquire `8101` ✅; submit era-wrap `82008206d818…` ✅.
- live full loop: HTTP submit via cardano-submit-api (202) → tx **SIGHTED in the mempool
  ~2s later by a draining TxMonitor client** (hash match `1fcd1677…`), parsed every cycle,
  disappeared on block inclusion, **zero connection errors, watcher survived** —
  the first successful non-empty-mempool drain in this library's history.
