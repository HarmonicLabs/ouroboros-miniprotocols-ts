/**
 * ChainSync bulk benchmark: sequential requestNext from origin.
 *
 * Single connection, N sequential requestNext calls.
 * Measures per-header overhead - the most important benchmark since
 * chain sync is the hottest path in any Cardano indexer.
 */
import { bench, describe, beforeAll, afterAll } from "@effect/vitest";
import { Duration, Effect, Layer, ManagedRuntime } from "effect";
import { connect } from "net";

import { HandshakeClient } from "../../protocols/handshake/Client";
import { ChainSyncClient } from "../../protocols/chain-sync/Client";
import { ChainPointType } from "../../protocols/types/ChainPoint";
import { HOST, PORT, ChainSyncLayer, preprodVersionTable, makeLegacyVersionData } from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

type RT = ManagedRuntime.ManagedRuntime<
    Layer.Success<typeof ChainSyncLayer>,
    Layer.Error<typeof ChainSyncLayer>
>;

describe("ChainSync requestNext (bulk)", () => {
    let effectRuntime: RT;
    let legacyMplexer: any;
    let legacyCS: any;

    beforeAll(async () => {
        effectRuntime = ManagedRuntime.make(ChainSyncLayer);
        await effectRuntime.runPromise(
            Effect.gen(function* () {
                const hs = yield* HandshakeClient;
                yield* hs.propose(preprodVersionTable);
                const cs = yield* ChainSyncClient;
                yield* cs.findIntersect([{ _tag: ChainPointType.Origin }]);
            }).pipe(Effect.scoped),
        );

        await new Promise<void>((resolve, reject) => {
            legacyMplexer = new Legacy.Multiplexer({
                protocolType: "node-to-node",
                connect: () => connect({ host: HOST, port: PORT }),
            });
            const hs = new Legacy.HandshakeClient(legacyMplexer);
            legacyCS = new Legacy.ChainSyncClient(legacyMplexer);
            hs.propose(legacyVD)
                .then(() => legacyCS.findIntersect([{}]))
                .then(() => { hs.terminate(); resolve(); })
                .catch(reject);
            setTimeout(() => reject(new Error("timeout")), 15_000);
        });
    }, 30_000);

    afterAll(async () => {
        await effectRuntime.dispose();
        legacyCS?.done();
        legacyMplexer?.close();
    });

    bench(
        "Effect-TS",
        async () => {
            await effectRuntime.runPromise(
                Effect.gen(function* () {
                    const cs = yield* ChainSyncClient;
                    yield* cs.requestNext();
                }).pipe(Effect.scoped, Effect.timeout(Duration.seconds(15))),
            );
        },
        { iterations: 100, warmupIterations: 0 },
    );

    bench(
        "Legacy",
        async () => {
            await legacyCS.requestNext();
        },
        { iterations: 100, warmupIterations: 0 },
    );
});
