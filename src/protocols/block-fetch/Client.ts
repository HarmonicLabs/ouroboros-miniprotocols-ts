import {
    Cause,
    Duration,
    Effect,
    Layer,
    Option,
    Queue,
    Schema,
    Scope,
    ServiceMap,
    Stream,
} from "effect";
import { Socket } from "effect/unstable/socket";

import { Multiplexer } from "../../multiplexer/Multiplexer";
import { MultiplexerEncodingError } from "../../multiplexer/Errors";
import { MiniProtocol } from "../../MiniProtocol";
import { ChainPoint } from "../types/ChainPoint";
import * as Schemas from "./Schemas";

export class BlockFetchError
    extends Schema.TaggedErrorClass<BlockFetchError>()("BlockFetchError", {
        cause: Schema.Defect,
    }) {}

const decodeMessage = Schema.decodeUnknownEffect(
    Schemas.BlockFetchMessageBytes,
);
const encodeMessage = Schema.encodeUnknownEffect(
    Schemas.BlockFetchMessageBytes,
);

export class BlockFetchClient extends ServiceMap.Service<BlockFetchClient, {
    requestRange: (from: ChainPoint, to: ChainPoint) => Effect.Effect<
        Option.Option<
            Stream.Stream<
                Uint8Array,
                BlockFetchError | Schema.SchemaError,
                Scope.Scope
            >
        >,
        | BlockFetchError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError
        | Cause.TimeoutError,
        Scope.Scope
    >;
    done: () => Effect.Effect<
        void,
        | BlockFetchError
        | MultiplexerEncodingError
        | Socket.SocketError
        | Schema.SchemaError,
        Scope.Scope
    >;
}>()("@harmoniclabs/ouroboros-miniprotocols-ts/BlockFetchClient") {
    static readonly layer = Layer.effect(
        BlockFetchClient,
        Effect.gen(function* () {
            const multiplexer = yield* Multiplexer;
            const channel = yield* multiplexer.getProtocolChannel(
                MiniProtocol.BlockFetch,
            ).pipe(
                Effect.mapError((cause) => new BlockFetchError({ cause })),
            );

            const inbox = yield* Queue.unbounded<Schemas.BlockFetchMessageT>();
            yield* channel.incoming.pipe(
                Stream.mapEffect((bytes) => decodeMessage(bytes)),
                Stream.runForEach((msg) => Queue.offer(inbox, msg)),
                Effect.forkChild,
            );

            const sendMessage = (msg: Schemas.BlockFetchMessageT) =>
                encodeMessage(msg).pipe(Effect.flatMap(channel.send));

            const receiveOne = Queue.take(inbox);

            return BlockFetchClient.of({
                requestRange: Effect.fn("BlockFetchClient.requestRange")(
                    function* (from: ChainPoint, to: ChainPoint) {
                        yield* sendMessage({
                            _tag: Schemas.BlockFetchMessageType.RequestRange,
                            from,
                            to,
                        });

                        // Wait for StartBatch or NoBlocks
                        const firstMsg = yield* receiveOne.pipe(
                            Effect.timeout(Duration.seconds(60)),
                        );

                        if (
                            firstMsg._tag ===
                                Schemas.BlockFetchMessageType.NoBlocks
                        ) {
                            return Option.none();
                        }

                        if (
                            firstMsg._tag !==
                                Schemas.BlockFetchMessageType.StartBatch
                        ) {
                            return yield* Effect.fail(
                                new BlockFetchError({
                                    cause:
                                        `Unexpected message: ${firstMsg._tag}`,
                                }),
                            );
                        }

                        // Collect blocks from queue until BatchDone
                        const blocks: Uint8Array[] = [];
                        let msg = yield* receiveOne;
                        while (msg._tag !== Schemas.BlockFetchMessageType.BatchDone) {
                            if (msg._tag === Schemas.BlockFetchMessageType.Block) {
                                blocks.push(msg.block);
                            }
                            msg = yield* receiveOne;
                        }

                        return Option.some(Stream.fromIterable(blocks));
                    },
                ),
                done: Effect.fn("BlockFetchClient.done")(
                    function* () {
                        yield* sendMessage({
                            _tag: Schemas.BlockFetchMessageType.ClientDone,
                        });
                    },
                ),
            });
        }),
    );
}
