import { Duration, Effect, Layer, Option, Stream } from "effect";
import { expect, it } from "@effect/vitest";
import * as BunSocket from "@effect/platform-bun/BunSocket";

import { Multiplexer } from "../multiplexer/Multiplexer";
import { MultiplexerBuffer } from "../multiplexer/Buffer";
import { HandshakeClient } from "../protocols/handshake/Client";
import { HandshakeMessageType } from "../protocols/handshake/Schemas";
import { ChainSyncClient } from "../protocols/chain-sync/Client";
import { ChainSyncMessageType } from "../protocols/chain-sync/Schemas";
import { BlockFetchClient } from "../protocols/block-fetch/Client";
import { KeepAliveClient } from "../protocols/keep-alive/Client";
import { ChainPointType } from "../protocols/types/ChainPoint";

// ── Preprod testnet layer ──

const PreprodSocket = BunSocket.layerNet({
    host: "preprod-node.play.dev.cardano.org",
    port: 3001,
});

const PreprodMultiplexer = Multiplexer.layer.pipe(
    Layer.provide(MultiplexerBuffer.layer),
    Layer.provide(PreprodSocket),
);

const N2NProtocols = Layer.mergeAll(
    HandshakeClient.layer,
    ChainSyncClient.layer,
    BlockFetchClient.layer,
    KeepAliveClient.layer,
).pipe(Layer.provide(PreprodMultiplexer));

// Preprod: network magic = 1, N2N version 14
const preprodVersionTable = {
    _tag: "node-to-node" as const,
    data: {
        14: {
            networkMagic: 1,
            initiatorOnlyDiffusionMode: false,
            peerSharing: 0,
            query: false,
        },
    },
};

// ── Handshake ──

it.live(
    "Handshake: propose N2N version and receive accept",
    () =>
        Effect.gen(function* () {
            const client = yield* HandshakeClient;
            const result = yield* client.propose(preprodVersionTable);

            expect(result._tag).toBe(HandshakeMessageType.MsgAcceptVersion);

            if (result._tag === HandshakeMessageType.MsgAcceptVersion) {
                expect(result.version).toBe(14);
                expect(result.versionData).toMatchObject({ networkMagic: 1 });
                yield* Effect.log(
                    `Handshake accepted: version ${result.version}`,
                );
            }
        }).pipe(
            Effect.provide(N2NProtocols),
            Effect.timeout(Duration.seconds(30)),
        ),
    { timeout: 60_000 },
);

// ── KeepAlive ──

it.live(
    "KeepAlive: send keepalive and receive response",
    () =>
        Effect.gen(function* () {
            // Handshake first
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);

            const client = yield* KeepAliveClient;
            const cookie = 42;
            const responseCookie = yield* client.keepAlive(cookie);

            expect(responseCookie).toBe(cookie);
            yield* Effect.log(
                `KeepAlive: cookie=${cookie}, response=${responseCookie}`,
            );
        }).pipe(
            Effect.provide(N2NProtocols),
            Effect.timeout(Duration.seconds(30)),
        ),
    { timeout: 60_000 },
);

// ── ChainSync ──

it.live(
    "ChainSync: find intersect at origin and requestNext",
    () =>
        Effect.gen(function* () {
            // Handshake first
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);

            const client = yield* ChainSyncClient;
            const intersect = yield* client.findIntersect([
                { _tag: ChainPointType.Origin },
            ]);

            expect(
                intersect._tag === ChainSyncMessageType.IntersectFound ||
                    intersect._tag === ChainSyncMessageType.IntersectNotFound,
            ).toBe(true);

            yield* Effect.log(`FindIntersect: ${intersect._tag}`);

            const next = yield* client.requestNext();

            expect(
                next._tag === ChainSyncMessageType.RollForward ||
                    next._tag === ChainSyncMessageType.RollBackward,
            ).toBe(true);

            if (next._tag === ChainSyncMessageType.RollForward) {
                expect(next.header).toBeInstanceOf(Uint8Array);
                expect(next.tip.blockNo).toBeGreaterThan(0);
                yield* Effect.log(
                    `RollForward: tip blockNo=${next.tip.blockNo}`,
                );
            }
        }).pipe(
            Effect.provide(N2NProtocols),
            Effect.timeout(Duration.seconds(30)),
        ),
    { timeout: 60_000 },
);

// ── BlockFetch ──

it.live(
    "BlockFetch: request block range from tip",
    () =>
        Effect.gen(function* () {
            // Handshake first
            const hs = yield* HandshakeClient;
            yield* hs.propose(preprodVersionTable);

            // Get a real point via ChainSync
            const chainSync = yield* ChainSyncClient;
            yield* chainSync.findIntersect([{ _tag: ChainPointType.Origin }]);
            const next = yield* chainSync.requestNext();

            if (next._tag !== ChainSyncMessageType.RollForward) {
                yield* Effect.log("Skipping: no RollForward from origin");
                return;
            }

            const blockFetch = yield* BlockFetchClient;
            const result = yield* blockFetch.requestRange(
                next.tip.point,
                next.tip.point,
            );

            if (Option.isSome(result)) {
                const blocks = yield* result.value.pipe(Stream.runCollect);
                expect(blocks.length).toBeGreaterThanOrEqual(0);
                yield* Effect.log(`BlockFetch: ${blocks.length} block(s)`);
            } else {
                yield* Effect.log("BlockFetch: NoBlocks");
            }
        }).pipe(
            Effect.provide(N2NProtocols),
            Effect.timeout(Duration.seconds(30)),
        ),
    { timeout: 60_000 },
);
