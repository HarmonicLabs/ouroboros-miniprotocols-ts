/**
 * Handshake benchmark: propose → accept round-trip.
 *
 * Each iteration opens a fresh TCP connection, performs the full Ouroboros
 * handshake, and tears down. Isolates: TCP connect + multiplexer init +
 * CBOR codec + frame overhead.
 */
import { bench, describe } from "@effect/vitest";
import { Duration, Effect } from "effect";
import { connect } from "net";

import { HandshakeClient } from "../../protocols/handshake/Client";
import { HandshakeMessageType } from "../../protocols/handshake/Schemas";
import { HandshakeLayer, HOST, PORT, preprodVersionTable, makeLegacyVersionData } from "./shared";

const Legacy = require("@harmoniclabs/ouroboros-miniprotocols-ts");
const legacyVD = makeLegacyVersionData(Legacy);

describe("Handshake", () => {
    bench(
        "Effect-TS",
        async () => {
            await Effect.gen(function* () {
                const client = yield* HandshakeClient;
                const result = yield* client.propose(preprodVersionTable);
                if (result._tag !== HandshakeMessageType.MsgAcceptVersion) {
                    throw new Error(`Unexpected: ${result._tag}`);
                }
            }).pipe(
                Effect.scoped,
                Effect.provide(HandshakeLayer),
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
                hs.propose(legacyVD)
                    .then(() => { hs.terminate(); mplexer.close(); resolve(); })
                    .catch((e: any) => { mplexer.close(); reject(e); });
                setTimeout(() => { mplexer.close(); reject(new Error("timeout")); }, 15_000);
            });
        },
        { iterations: 10, warmupIterations: 0 },
    );
});
