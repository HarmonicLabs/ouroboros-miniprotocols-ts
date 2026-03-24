/**
 * ChainSync one-off benchmark: findIntersect + requestNext.
 *
 * Each iteration: connection → handshake → findIntersect → requestNext → close.
 * Measures full lifecycle for a single header fetch.
 */
import { bench, describe } from "@effect/vitest";
import { Duration, Effect } from "effect";
import { connect } from "net";

import { HandshakeClient } from "../../protocols/handshake/Client";
import { ChainSyncClient } from "../../protocols/chain-sync/Client";
import { ChainPointType } from "../../protocols/types/ChainPoint";
import { HOST, PORT, ChainSyncLayer, preprodVersionTable, makeLegacyVersionData } from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

describe("ChainSync (one-off)", () => {
    bench(
        "Effect-TS",
        async () => {
            await Effect.gen(function* () {
                const hs = yield* HandshakeClient;
                yield* hs.propose(preprodVersionTable);
                const cs = yield* ChainSyncClient;
                yield* cs.findIntersect([{ _tag: ChainPointType.Origin }]);
                yield* cs.requestNext();
            }).pipe(
                Effect.scoped,
                Effect.provide(ChainSyncLayer),
                Effect.timeout(Duration.seconds(15)),
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
                hs.propose(legacyVD)
                    .then(() => cs.findIntersect([{}]))
                    .then(() => cs.requestNext())
                    .then(() => { hs.terminate(); cs.done(); mplexer.close(); resolve(); })
                    .catch((e: any) => { mplexer.close(); reject(e); });
                setTimeout(() => { mplexer.close(); reject(new Error("timeout")); }, 15_000);
            });
        },
        { iterations: 10, warmupIterations: 0 },
    );
});
