/**
 * BlockFetch one-off benchmark: fetch tip block.
 *
 * Each iteration: connection → handshake → chainSync → fetch 1 block → close.
 * Measures full lifecycle for fetching a single block body.
 */
import { bench, describe } from "@effect/vitest";
import { Duration, Effect, Option, Stream } from "effect";
import { connect } from "net";

import { HandshakeClient } from "../../protocols/handshake/Client";
import { ChainSyncClient } from "../../protocols/chain-sync/Client";
import { ChainSyncMessageType } from "../../protocols/chain-sync/Schemas";
import { BlockFetchClient } from "../../protocols/block-fetch/Client";
import { ChainPointType } from "../../protocols/types/ChainPoint";
import { HOST, PORT, BlockFetchLayer, preprodVersionTable, makeLegacyVersionData } from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

describe("BlockFetch (one-off)", () => {
    bench(
        "Effect-TS",
        async () => {
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
        },
        { iterations: 10, warmupIterations: 0 },
    );

    bench(
        "Legacy",
        async () => {
            await new Promise<void>((resolve, reject) => {
                const mplexer = new Legacy.Multiplexer({
                    protocolType: "node-to-node",
                    connect: () => connect({ host: HOST, port: PORT }),
                });
                const hs = new Legacy.HandshakeClient(mplexer);
                const cs = new Legacy.ChainSyncClient(mplexer);
                const bf = new Legacy.BlockFetchClient(mplexer);
                hs.propose(legacyVD)
                    .then(() => cs.findIntersect([{}]))
                    .then(() => cs.requestNext())
                    .then((next: any) => {
                        if (!next.tip?.point?.blockHeader) return;
                        return bf.requestRange(next.tip.point, next.tip.point);
                    })
                    .then(() => { hs.terminate(); cs.done(); bf.done(); mplexer.close(); resolve(); })
                    .catch((e: any) => { mplexer.close(); reject(e); });
                setTimeout(() => { mplexer.close(); reject(new Error("timeout")); }, 30_000);
            });
        },
        { iterations: 10, warmupIterations: 0 },
    );
});
