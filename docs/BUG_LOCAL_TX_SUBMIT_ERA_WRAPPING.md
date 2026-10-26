# BUG: LocalTxSubmit `MsgSubmitTx` missing era wrapping — `submit()` hangs forever

**Status:** FIXED in `0.0.5-dev9` (found 2026-08-05, wire-proven against a preprod node)
**Affects:** every published version through `0.0.5-dev8`
**Severity:** the `LocalTxSubmitClient.submit()` API is unusable — same "dead on arrival"
class as the TxMonitor Acquire/GetSizes encoding bug fixed in dev8.

## The bug

`LocalTxSubmitSubmit.toCborObj()` encodes the message as `[0, txBytes]`:

**`src/protocols/local-tx-submit/messages/LocalTxSubmitSubmit.ts:42-49`**
```ts
toCborObj(): CborArray
{
    if( this.cborRef instanceof SubCborRef ) return Cbor.parse( this.cborRef.toBuffer() ) as CborArray;
    return new CborArray([
        new CborUInt(0),
        new CborBytes( this.tx )        // ← plain byte string: WRONG
    ]);
}
```

The node-to-client LocalTxSubmission spec requires the transaction to be **era-wrapped**:

```
msgSubmitTx = [0, tx]
tx          = [era, #6.24(txBytes)]     ; era word: 6 = Conway (Babbage = 5, …)
```

so the correct wire form is `[0, [era, CborTag(24, CborBytes(txBytes))]]`.

## Observed behavior

The node cannot decode the payload → it terminates the session (client sees a raw socket
error or nothing at all) → neither `accept` nor `reject` ever fires → the promise returned
by `LocalTxSubmitClient.submit()` **never settles**. Because the failure is silent, it
masks itself — nothing logs, nothing throws.

## Wire proof (local preprod node, 2026-08-05)

- `submit()` as shipped: hang + socket error, no reply.
- Hand-rolled `[0, [6, #6.24(txBytes)]]` sent over protocol 6 on the same connection type:
  node replied **MsgAcceptTx**, twice, and both txs **confirmed on-chain**
  (`5591ba549a6b9eca…`, `0c324404e2ba5439…` @ preprod block 5018666).
- Working external repro:
  `gravity-monorepo/gravity-sdk/gravity-testing/agent-test-harness/mempoolWatchE2E.ts`
  (the hand-rolled submit block, marked `LIB BUG #2`).

## Suggested fix

In `toCborObj()` (and mirrored in `fromCborObj`, which currently only accepts the flat
`CborBytes` form at `LocalTxSubmitSubmit.ts:66-70`):

```ts
return new CborArray([
    new CborUInt(0),
    new CborArray([
        new CborUInt( this.era ),                 // new field; default 6 (Conway)
        new CborTag( 24, new CborBytes( this.tx ) ),
    ]),
]);
```

Era should be a constructor option (`ILocalTxSubmitSubmit.era?: number`, default Conway)
so the client keeps working across future eras. `fromCborObj` should accept the wrapped
form and expose `era` + unwrapped `tx` bytes.

Reply-side parsing (`LocalTxSubmitAccept`/`LocalTxSubmitReject`) is correct — no change.

## Suggested regression test

Encode `new LocalTxSubmitSubmit({ tx })` and assert the bytes equal
`Cbor.encode([0, [6, Tag(24, tx)]])`; plus (ideally) a live smoke against a node socket —
this bug class (encoder never exercised against a real node) has now produced two
release-blocking hangs (TxMonitor dev8 fix + this one), so a `scripts/` socket smoke like
gravity-backend's `testMempoolSocket.ts` is worth carrying in this repo.

---

# dev9 VERIFICATION (2026-08-05) + one open anomaly

**The fix is verified working:**
- `new LocalTxSubmitSubmit({tx}).toCbor()` = `82008206d81841a0` — era-wrapped correctly.
- `LocalTxSubmitClient.submit()` against a live preprod node: **accepted**, repeatedly
  (`dd5ab13a…`, `9af8af13…`, `88e78418…`, `c50b85e0…` — all confirmed on-chain).
- TxMonitor dev8 fix regression-free (`8101`/`8109` intact).

**OPEN ANOMALY (unexplained, worth a look):** every time a submit is ACCEPTED, other
n2c connections open from Bun processes on the same machine get a socket error at the
same moment (observed 4/4 runs: both a sibling connection in the same process AND a
TxMonitor-only watcher in a *different* process). Control tests: two concurrent
TxMonitor clients WITHOUT any submission coexist fine (15+5 cycles clean); the
cardano-node process never restarts (PID stable). So it is specifically
submit-accept-correlated. Repro: run
`gravity-backend/scripts/testMempoolSocket.ts` (CYCLES=15) and, ~5s later,
`gravity-sdk/gravity-testing/agent-test-harness/justSubmitLocal.ts` — the watcher's
socket dies as the submit is accepted.

**Related paper-cut:** `Multiplexer.js` `handleSocketError` (dist line ~121) wraps the
underlying error as a generic `Error: socket error`, discarding the original errno /
message — diagnosing THIS anomaly requires that detail. Suggest preserving the cause
(`new Error("socket error", { cause: err })` or logging `err`).
