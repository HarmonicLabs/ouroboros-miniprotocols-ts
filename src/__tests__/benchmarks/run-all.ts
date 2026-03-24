/**
 * Benchmark runner using Tinybench directly (matching the Effect-TS team's
 * pattern from effect-smol/packages/effect/benchmark/).
 *
 * Usage: bun src/__tests__/benchmarks/run-all.ts
 *
 * Uses Tinybench directly rather than vitest's bench wrapper because
 * vitest's bench runner has flaky socket handling with node:net in Bun.
 */
import { Bench } from "tinybench";
import { Duration, Effect, Layer, ManagedRuntime, Option, Stream } from "effect";
import * as BunSocket from "@effect/platform-bun/BunSocket";
import { connect } from "net";

import { Multiplexer } from "../../multiplexer/Multiplexer";
import { MultiplexerBuffer } from "../../multiplexer/Buffer";
import { HandshakeClient } from "../../protocols/handshake/Client";
import { HandshakeMessageType } from "../../protocols/handshake/Schemas";
import { KeepAliveClient } from "../../protocols/keep-alive/Client";
import { ChainSyncClient } from "../../protocols/chain-sync/Client";
import { ChainSyncMessageType } from "../../protocols/chain-sync/Schemas";
import { BlockFetchClient } from "../../protocols/block-fetch/Client";
import { ChainPoint, ChainPointType } from "../../protocols/types/ChainPoint";

import {
    HOST,
    PORT,
    HandshakeLayer,
    KeepAliveLayer,
    ChainSyncLayer,
    BlockFetchLayer,
    preprodVersionTable,
    makeLegacyVersionData,
} from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

// ── Helper: create legacy connection + handshake ──

async function legacyConnect(): Promise<{ mplexer: any; hs: any; cs: any; bf: any; ka: any }> {
    return new Promise((resolve, reject) => {
        const mplexer = new Legacy.Multiplexer({
            protocolType: "node-to-node",
            connect: () => connect({ host: HOST, port: PORT }),
        });
        const hs = new Legacy.HandshakeClient(mplexer);
        const cs = new Legacy.ChainSyncClient(mplexer);
        const bf = new Legacy.BlockFetchClient(mplexer);
        const ka = new Legacy.KeepAliveClient(mplexer);
        hs.propose(legacyVD)
            .then(() => resolve({ mplexer, hs, cs, bf, ka }))
            .catch((e: any) => { mplexer.close(); reject(e); });
        setTimeout(() => { mplexer.close(); reject(new Error("legacy connect timeout")); }, 30_000);
    });
}

// ════════════════════════════════════════════════════════
// 1. Handshake (one-off)
// ════════════════════════════════════════════════════════

async function benchHandshake() {
    console.log("\n═══ Handshake (one-off: new connection per iteration) ═══\n");
    const bench = new Bench({ iterations: 10, warmupIterations: 0, time: 500 });

    bench.add("Effect-TS", async () => {
        await Effect.gen(function* () {
            const client = yield* HandshakeClient;
            const result = yield* client.propose(preprodVersionTable);
            if (result._tag !== HandshakeMessageType.MsgAcceptVersion) {
                throw new Error(`Unexpected: ${result._tag}`);
            }
        }).pipe(
            Effect.scoped,
            Effect.provide(HandshakeLayer),
            Effect.timeout(Duration.seconds(30)),
            Effect.runPromise,
        );
    });

    bench.add("Legacy", async () => {
        const conn = await legacyConnect();
        conn.hs.terminate();
        conn.mplexer.close();
    });

    await bench.run();
    console.table(bench.table());
}

// ════════════════════════════════════════════════════════
// 2. KeepAlive (one-off)
// ════════════════════════════════════════════════════════

async function benchKeepAliveOneOff() {
    console.log("\n═══ KeepAlive (one-off: new connection per iteration) ═══\n");
    const bench = new Bench({ iterations: 5, warmupIterations: 0, time: 500 });

    bench.add("Effect-TS", async () => {
        await Effect.gen(function* () {
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);
            const ka = yield* KeepAliveClient;
            yield* ka.keepAlive(42);
        }).pipe(
            Effect.scoped,
            Effect.provide(KeepAliveLayer),
            Effect.timeout(Duration.seconds(30)),
            Effect.runPromise,
        );
    });

    bench.add("Legacy", async () => {
        const conn = await legacyConnect();
        try {
            await conn.ka.request(42);
        } finally {
            conn.hs.terminate();
            conn.mplexer.close();
        }
    });

    await bench.run();
    console.table(bench.table());
}

// ════════════════════════════════════════════════════════
// 3. KeepAlive (bulk: persistent connection)
// ════════════════════════════════════════════════════════

async function benchKeepAliveBulk() {
    console.log("\n═══ KeepAlive (bulk: 50 round-trips, persistent connection) ═══\n");

    // Effect-TS: ManagedRuntime
    const effectRT = ManagedRuntime.make(KeepAliveLayer);
    await effectRT.runPromise(
        Effect.gen(function* () {
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);
        }).pipe(Effect.scoped),
    );

    // Legacy: persistent connection
    const legacy = await legacyConnect();
    legacy.hs.terminate(); // don't need hs after handshake

    let cookie = 0;
    const bench = new Bench({ iterations: 50, warmupIterations: 0, time: 500 });

    bench.add("Effect-TS", async () => {
        await effectRT.runPromise(
            Effect.gen(function* () {
                const ka = yield* KeepAliveClient;
                yield* ka.keepAlive(cookie++);
            }).pipe(Effect.scoped, Effect.timeout(Duration.seconds(30))),
        );
    });

    bench.add("Legacy", async () => {
        await legacy.ka.request(cookie++);
    });

    await bench.run();
    console.table(bench.table());

    await effectRT.dispose();
    legacy.mplexer.close();
}

// ════════════════════════════════════════════════════════
// 4. ChainSync (one-off)
// ════════════════════════════════════════════════════════

async function benchChainSyncOneOff() {
    console.log("\n═══ ChainSync (one-off: handshake + findIntersect + requestNext) ═══\n");
    const bench = new Bench({ iterations: 10, warmupIterations: 0, time: 500 });

    bench.add("Effect-TS", async () => {
        await Effect.gen(function* () {
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);
            const cs = yield* ChainSyncClient;
            yield* cs.findIntersect([{ _tag: ChainPointType.Origin }]);
            yield* cs.requestNext();
        }).pipe(
            Effect.scoped,
            Effect.provide(ChainSyncLayer),
            Effect.timeout(Duration.seconds(30)),
            Effect.runPromise,
        );
    });

    bench.add("Legacy", async () => {
        const conn = await legacyConnect();
        try {
            await conn.cs.findIntersect([{}]);
            await conn.cs.requestNext();
        } finally {
            conn.cs.done();
            conn.hs.terminate();
            conn.mplexer.close();
        }
    });

    await bench.run();
    console.table(bench.table());
}

// ════════════════════════════════════════════════════════
// 5. ChainSync requestNext (bulk: streaming headers)
// ════════════════════════════════════════════════════════

async function benchChainSyncBulk() {
    console.log("\n═══ ChainSync requestNext (bulk: 100 headers, persistent connection) ═══\n");

    const effectRT = ManagedRuntime.make(ChainSyncLayer);
    await effectRT.runPromise(
        Effect.gen(function* () {
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);
            const cs = yield* ChainSyncClient;
            yield* cs.findIntersect([{ _tag: ChainPointType.Origin }]);
        }).pipe(Effect.scoped),
    );

    const legacy = await legacyConnect();
    await legacy.cs.findIntersect([{}]);
    legacy.hs.terminate();

    const bench = new Bench({ iterations: 100, warmupIterations: 0, time: 500 });

    bench.add("Effect-TS", async () => {
        await effectRT.runPromise(
            Effect.gen(function* () {
                const cs = yield* ChainSyncClient;
                yield* cs.requestNext();
            }).pipe(Effect.scoped, Effect.timeout(Duration.seconds(30))),
        );
    });

    bench.add("Legacy", async () => {
        await legacy.cs.requestNext();
    });

    await bench.run();
    console.table(bench.table());

    await effectRT.dispose();
    legacy.cs.done();
    legacy.mplexer.close();
}

// ════════════════════════════════════════════════════════
// 6. BlockFetch (one-off)
// ════════════════════════════════════════════════════════

async function benchBlockFetchOneOff() {
    console.log("\n═══ BlockFetch (one-off: handshake + chainSync + fetch 1 block) ═══\n");
    const bench = new Bench({ iterations: 10, warmupIterations: 0, time: 500 });

    bench.add("Effect-TS", async () => {
        await Effect.gen(function* () {
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);
            const cs = yield* ChainSyncClient;
            yield* cs.findIntersect([{ _tag: ChainPointType.Origin }]);
            const next = yield* cs.requestNext();
            if (next._tag !== ChainSyncMessageType.RollForward) return;
            const bf = yield* BlockFetchClient;
            const result = yield* bf.requestRange(next.tip.point, next.tip.point);
            if (Option.isSome(result)) {
                yield* result.value.pipe(Stream.runCollect);
            }
        }).pipe(
            Effect.scoped,
            Effect.provide(BlockFetchLayer),
            Effect.timeout(Duration.seconds(30)),
            Effect.runPromise,
        );
    });

    bench.add("Legacy", async () => {
        const conn = await legacyConnect();
        try {
            await conn.cs.findIntersect([{}]);
            const next = await conn.cs.requestNext();
            if (next.tip?.point?.blockHeader) {
                await conn.bf.requestRange(next.tip.point, next.tip.point);
            }
        } finally {
            conn.cs.done();
            conn.bf.done();
            conn.hs.terminate();
            conn.mplexer.close();
        }
    });

    await bench.run();
    console.table(bench.table());
}

// ════════════════════════════════════════════════════════
// 7. BlockFetch (bulk: per-block fetch overhead)
// ════════════════════════════════════════════════════════

async function benchBlockFetchBulk() {
    console.log("\n═══ BlockFetch (bulk: 20 blocks, persistent connection) ═══\n");

    const WALK_DEPTH = 50;

    // Effect-TS: collect points
    const effectRT = ManagedRuntime.make(BlockFetchLayer);
    const effectPoints: ChainPoint[] = await effectRT.runPromise(
        Effect.gen(function* () {
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);
            const cs = yield* ChainSyncClient;
            yield* cs.findIntersect([{ _tag: ChainPointType.Origin }]);
            const pts: ChainPoint[] = [];
            for (let i = 0; i < WALK_DEPTH; i++) {
                const msg = yield* cs.requestNext();
                if (msg._tag === ChainSyncMessageType.RollForward && msg.tip.point._tag !== ChainPointType.Origin) {
                    pts.push(msg.tip.point);
                }
            }
            return pts;
        }).pipe(Effect.scoped),
    );

    // Legacy: collect points
    const legacy = await legacyConnect();
    await legacy.cs.findIntersect([{}]);
    const legacyPoints: any[] = [];
    for (let i = 0; i < WALK_DEPTH; i++) {
        const msg = await legacy.cs.requestNext();
        if (msg.tip?.point?.blockHeader) legacyPoints.push(msg.tip.point);
    }
    legacy.hs.terminate();
    legacy.cs.done();

    let eIdx = 0;
    let lIdx = 0;
    const bench = new Bench({ iterations: 20, warmupIterations: 0, time: 500 });

    bench.add("Effect-TS", async () => {
        const point = effectPoints[eIdx++ % effectPoints.length];
        await effectRT.runPromise(
            Effect.gen(function* () {
                const bf = yield* BlockFetchClient;
                const result = yield* bf.requestRange(point, point);
                if (Option.isSome(result)) {
                    yield* result.value.pipe(Stream.runCollect);
                }
            }).pipe(Effect.scoped, Effect.timeout(Duration.seconds(30))),
        );
    });

    bench.add("Legacy", async () => {
        const point = legacyPoints[lIdx++ % legacyPoints.length];
        await legacy.bf.requestRange(point, point);
    });

    await bench.run();
    console.table(bench.table());

    await effectRT.dispose();
    legacy.bf.done();
    legacy.mplexer.close();
}

// ════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════

async function main() {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  Ouroboros Miniprotocols Benchmark Suite                ║");
    console.log("║  Effect-TS (v4 beta) vs Legacy (EventEmitter/Promise)  ║");
    console.log("║  Target: preprod-node.play.dev.cardano.org:3001        ║");
    console.log("╚══════════════════════════════════════════════════════════╝");

    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const benchmarks = [
        benchHandshake,
        benchKeepAliveOneOff,
        benchKeepAliveBulk,
        benchChainSyncOneOff,
        benchChainSyncBulk,
        benchBlockFetchOneOff,
        benchBlockFetchBulk,
    ];

    for (const fn of benchmarks) {
        try {
            await fn();
        } catch (e) {
            const msg = e instanceof Error ? e.message : (e as any)?._tag ?? String(e);
            console.error(`\n[WARN] ${fn.name} failed:`, msg);
        }
        await pause(10_000); // let connections fully close + avoid node rate limit
    }

    console.log("\n══════════════════════════════════════════════════════");
    console.log("All benchmarks complete.");
    console.log("══════════════════════════════════════════════════════");
}

main().catch((e) => {
    console.error("Benchmark failed:", e);
    process.exit(1);
});
