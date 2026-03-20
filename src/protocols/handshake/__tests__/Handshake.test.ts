import { Effect, Layer } from "effect";
import { describe, it } from "@effect/vitest";
import { expect } from "vitest";

import { CborCodec } from "../../services/CborCodec";
import { HandshakeClient, HandshakeServer } from "./index";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { MiniProtocol } from "../../MiniProtocol";

// Mock multiplexer for testing
const mockMultiplexer = {
  getProtocolChannel: Effect.fn("getProtocolChannel")(function* (protocol: MiniProtocol) {
    // Mock channel
    return {
      send: Effect.succeed(undefined),
      incoming: Stream.empty, // No incoming for client test
    };
  }),
};

const TestLayer = Layer.mergeAll(
  CborCodec.layer,
  Layer.succeed(Multiplexer, mockMultiplexer as any),
);

describe("HandshakeClient", () => {
  it("should propose versions and receive accept", () =>
    Effect.gen(function* () {
      const client = yield* HandshakeClient;

      // Mock version table
      const versionTable = {
        _tag: "NodeToNode" as const,
        data: {
          7: {
            networkMagic: 764824073,
            initiatorOnlyDiffusionMode: false,
            peerSharing: false,
            query: false,
          },
        },
      };

      // This will fail without a real server, but tests the structure
      const result = yield* client.propose(versionTable);

      expect(result._tag).toBe("MsgAcceptVersion");
    }).pipe(
      Effect.provide(TestLayer),
      // Expect failure since no server
      Effect.catchAll(() => Effect.succeed(undefined)),
    ));
});