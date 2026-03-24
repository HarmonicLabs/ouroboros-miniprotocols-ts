/**
 * Shared setup for all benchmarks: Effect-TS layer construction and
 * preprod version table.
 */
import { Layer } from "effect";
import * as BunSocket from "@effect/platform-bun/BunSocket";

import { Multiplexer } from "../../multiplexer/Multiplexer";
import { MultiplexerBuffer } from "../../multiplexer/Buffer";
import { HandshakeClient } from "../../protocols/handshake/Client";
import { KeepAliveClient } from "../../protocols/keep-alive/Client";
import { ChainSyncClient } from "../../protocols/chain-sync/Client";
import { BlockFetchClient } from "../../protocols/block-fetch/Client";

export const HOST = "preprod-node.play.dev.cardano.org";
export const PORT = 3001;

// ── Effect-TS layers ──

export const PreprodSocket = BunSocket.layerNet({ host: HOST, port: PORT });

export const PreprodMultiplexer = Multiplexer.layer.pipe(
    Layer.provide(MultiplexerBuffer.layer),
    Layer.provide(PreprodSocket),
);

/** Handshake-only layer */
export const HandshakeLayer = HandshakeClient.layer.pipe(
    Layer.provide(PreprodMultiplexer),
);

/** Handshake + KeepAlive */
export const KeepAliveLayer = Layer.mergeAll(
    HandshakeClient.layer,
    KeepAliveClient.layer,
).pipe(Layer.provide(PreprodMultiplexer));

/** Handshake + ChainSync */
export const ChainSyncLayer = Layer.mergeAll(
    HandshakeClient.layer,
    ChainSyncClient.layer,
).pipe(Layer.provide(PreprodMultiplexer));

/** Handshake + ChainSync + BlockFetch */
export const BlockFetchLayer = Layer.mergeAll(
    HandshakeClient.layer,
    ChainSyncClient.layer,
    BlockFetchClient.layer,
).pipe(Layer.provide(PreprodMultiplexer));

/** Preprod: network magic = 1, N2N version 14 */
export const preprodVersionTable = {
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

// ── Legacy helpers ──
// Each bench file should `require("@harmoniclabs/ouroboros-miniprotocols-ts")`
// at its own module scope. Vitest's ESM transform breaks `require()` when it
// appears in a transitively-imported .ts module, so we keep it local.

export function makeLegacyVersionData(Legacy: any) {
    return new Legacy.VersionData({
        networkMagic: 1,
        initiatorOnlyDiffusionMode: false,
        peerSharing: false,
        query: false,
    });
}
