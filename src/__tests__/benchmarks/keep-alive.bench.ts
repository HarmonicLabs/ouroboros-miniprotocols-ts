/**
 * KeepAlive benchmark: per-message round-trip latency (one-off).
 *
 * Each iteration: new connection → handshake → single keepAlive → close.
 * Measures full lifecycle overhead per message.
 */
import { bench, describe } from "@effect/vitest";
import { Duration, Effect } from "effect";
import { connect } from "net";

import { HandshakeClient } from "../../protocols/handshake/Client";
import { KeepAliveClient } from "../../protocols/keep-alive/Client";
import { HOST, PORT, KeepAliveLayer, preprodVersionTable, makeLegacyVersionData } from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

describe("KeepAlive (one-off)", () => {
    bench(
        "Effect-TS",
        async () => {
            await Effect.gen(function* () {
                const hs = yield* HandshakeClient;
                yield* hs.propose(preprodVersionTable);
                const ka = yield* KeepAliveClient;
                yield* ka.keepAlive(42);
            }).pipe(
                Effect.scoped,
                Effect.provide(KeepAliveLayer),
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
                const ka = new Legacy.KeepAliveClient(mplexer);
                hs.propose(legacyVD)
                    .then(() => ka.request(42))
                    .then(() => { hs.terminate(); mplexer.close(); resolve(); })
                    .catch((e: any) => { mplexer.close(); reject(e); });
                setTimeout(() => { mplexer.close(); reject(new Error("timeout")); }, 15_000);
            });
        },
        { iterations: 10, warmupIterations: 0 },
    );
});
