/**
 * BlockFetch bulk benchmark: per-block fetch on persistent connection.
 *
 * Pre-collects chain points, then measures per-block fetch overhead.
 * Block bodies are much larger than chain-sync headers, stressing the
 * CBOR decode path.
 */
import { bench, describe, beforeAll, afterAll } from "@effect/vitest";
import { Duration, Effect, Layer, ManagedRuntime, Option, Stream } from "effect";
import { connect } from "net";

import { HandshakeClient } from "../../protocols/handshake/Client";
import { ChainSyncClient } from "../../protocols/chain-sync/Client";
import { ChainSyncMessageType } from "../../protocols/chain-sync/Schemas";
import { BlockFetchClient } from "../../protocols/block-fetch/Client";
import { ChainPoint, ChainPointType } from "../../protocols/types/ChainPoint";
import { HOST, PORT, BlockFetchLayer, preprodVersionTable, makeLegacyVersionData } from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

type RT = ManagedRuntime.ManagedRuntime<
    Layer.Success<typeof BlockFetchLayer>,
    Layer.Error<typeof BlockFetchLayer>
>;

const WALK_DEPTH = 50;

describe("BlockFetch (bulk)", () => {
    let effectRuntime: RT;
    let legacyMplexer: any;
    let legacyBF: any;
    let effectPoints: ChainPoint[] = [];
    let legacyPoints: any[] = [];
    let effectIdx = 0;
    let legacyIdx = 0;

    beforeAll(async () => {
        effectRuntime = ManagedRuntime.make(BlockFetchLayer);
        effectPoints = await effectRuntime.runPromise(
            Effect.gen(function* () {
                const hs = yield* HandshakeClient;
                yield* hs.propose(preprodVersionTable);
                const cs = yield* ChainSyncClient;
                yield* cs.findIntersect([{ _tag: ChainPointType.Origin }]);
                const pts: ChainPoint[] = [];
                for (let i = 0; i < WALK_DEPTH; i++) {
                    const msg = yield* cs.requestNext();
                    if (
                        msg._tag === ChainSyncMessageType.RollForward &&
                        msg.tip.point._tag !== ChainPointType.Origin
                    ) {
                        pts.push(msg.tip.point);
                    }
                }
                return pts;
            }).pipe(Effect.scoped),
        );

        await new Promise<void>((resolve, reject) => {
            legacyMplexer = new Legacy.Multiplexer({
                protocolType: "node-to-node",
                connect: () => connect({ host: HOST, port: PORT }),
            });
            const hs = new Legacy.HandshakeClient(legacyMplexer);
            const cs = new Legacy.ChainSyncClient(legacyMplexer);
            legacyBF = new Legacy.BlockFetchClient(legacyMplexer);
            hs.propose(legacyVD)
                .then(() => cs.findIntersect([{}]))
                .then(async () => {
                    for (let i = 0; i < WALK_DEPTH; i++) {
                        const msg = await cs.requestNext();
                        if (msg.tip?.point?.blockHeader) legacyPoints.push(msg.tip.point);
                    }
                    hs.terminate();
                    cs.done();
                    resolve();
                })
                .catch(reject);
            setTimeout(() => reject(new Error("timeout")), 120_000);
        });
    }, 180_000);

    afterAll(async () => {
        await effectRuntime.dispose();
        legacyBF?.done();
        legacyMplexer?.close();
    });

    bench(
        "Effect-TS",
        async () => {
            const point = effectPoints[effectIdx++ % effectPoints.length];
            await effectRuntime.runPromise(
                Effect.gen(function* () {
                    const bf = yield* BlockFetchClient;
                    const result = yield* bf.requestRange(point, point);
                    if (Option.isSome(result)) {
                        yield* result.value.pipe(Stream.runCollect);
                    }
                }).pipe(Effect.scoped, Effect.timeout(Duration.seconds(30))),
            );
        },
        { iterations: 20, warmupIterations: 0 },
    );

    bench(
        "Legacy",
        async () => {
            const point = legacyPoints[legacyIdx++ % legacyPoints.length];
            await legacyBF.requestRange(point, point);
        },
        { iterations: 20, warmupIterations: 0 },
    );
});
