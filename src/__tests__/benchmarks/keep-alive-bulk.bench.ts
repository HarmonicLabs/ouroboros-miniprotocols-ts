/**
 * KeepAlive bulk benchmark: per-message overhead on persistent connection.
 *
 * Single connection → handshake → N keepAlive round-trips.
 * Measures isolated per-message overhead (CBOR encode/decode + queue
 * dispatch + multiplexer framing) with connection costs factored out.
 */
import { bench, describe, beforeAll, afterAll } from "@effect/vitest";
import { Duration, Effect, Layer, ManagedRuntime } from "effect";
import { connect } from "net";

import { HandshakeClient } from "../../protocols/handshake/Client";
import { KeepAliveClient } from "../../protocols/keep-alive/Client";
import { HOST, PORT, KeepAliveLayer, preprodVersionTable, makeLegacyVersionData } from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

type RT = ManagedRuntime.ManagedRuntime<
    Layer.Success<typeof KeepAliveLayer>,
    Layer.Error<typeof KeepAliveLayer>
>;

describe("KeepAlive (bulk)", () => {
    let effectRuntime: RT;
    let legacyMplexer: any;
    let legacyKA: any;
    let cookie = 0;

    beforeAll(async () => {
        effectRuntime = ManagedRuntime.make(KeepAliveLayer);
        await effectRuntime.runPromise(
            Effect.gen(function* () {
                const hs = yield* HandshakeClient;
                yield* hs.propose(preprodVersionTable);
            }).pipe(Effect.scoped),
        );

        await new Promise<void>((resolve, reject) => {
            legacyMplexer = new Legacy.Multiplexer({
                protocolType: "node-to-node",
                connect: () => connect({ host: HOST, port: PORT }),
            });
            const hs = new Legacy.HandshakeClient(legacyMplexer);
            legacyKA = new Legacy.KeepAliveClient(legacyMplexer);
            hs.propose(legacyVD)
                .then(() => { hs.terminate(); resolve(); })
                .catch(reject);
            setTimeout(() => reject(new Error("timeout")), 15_000);
        });
    }, 30_000);

    afterAll(async () => {
        await effectRuntime.dispose();
        legacyMplexer?.close();
    });

    bench(
        "Effect-TS",
        async () => {
            await effectRuntime.runPromise(
                Effect.gen(function* () {
                    const ka = yield* KeepAliveClient;
                    yield* ka.keepAlive(cookie++);
                }).pipe(Effect.scoped, Effect.timeout(Duration.seconds(15))),
            );
        },
        { iterations: 50, warmupIterations: 0 },
    );

    bench(
        "Legacy",
        async () => {
            await legacyKA.request(cookie++);
        },
        { iterations: 50, warmupIterations: 0 },
    );
});
