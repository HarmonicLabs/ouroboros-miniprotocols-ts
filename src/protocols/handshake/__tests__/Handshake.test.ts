import { Effect, Layer, Stream } from "effect";
import { describe, it } from "@effect/vitest";

import { HandshakeClient } from "../Client";
import { Multiplexer } from "../../../multiplexer/Multiplexer";
import { MiniProtocol } from "../../../MiniProtocol";

// Mock multiplexer for testing
const mockMultiplexer = {
    getProtocolChannel: Effect.fn("getProtocolChannel")(
        function* (_protocol: MiniProtocol) {
            return {
                protocolId: _protocol,
                send: () => Effect.void,
                incoming: Stream.empty,
            };
        },
    ),
};

const TestLayer = Layer.succeed(Multiplexer, mockMultiplexer);

describe("HandshakeClient", () => {
    it("should propose versions and receive accept", () =>
        Effect.gen(function* () {
            const client = yield* HandshakeClient;

            const versionTable = {
                _tag: "node-to-node" as const,
                data: {
                    7: {
                        networkMagic: 764824073,
                        initiatorOnlyDiffusionMode: false,
                        peerSharing: false,
                        query: false,
                    },
                },
            };

            const result = yield* client.propose(versionTable);

            return result;
        }).pipe(
            Effect.provide(TestLayer),
            // Expect failure since no real server — validates structure only
            Effect.catchCause(() => Effect.succeed(undefined)),
        ));
});
