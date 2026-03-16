import { Effect, Layer, ServiceMap } from "effect"
import * as Socket from "effect/unstable/socket/Socket"

/**
 * Effect-TS Socket adapter for Ouroboros multiplexer
 * Provides Effect-TS Socket.Socket interface on top of existing multiplexer sockets
 */
export class OuroborosSocket extends ServiceMap.Service<OuroborosSocket, {
  /**
   * Get a socket for the specified protocol type
   */
  getSocket: (protocolType: "node-to-node" | "node-to-client") => Effect.Effect<Socket.Socket, Socket.SocketError>
}>()(
  // The string identifier for the service
  "@harmoniclabs/ouroboros-miniprotocols-ts/OuroborosSocket"
) {
  // Attach a static layer to the service
  static readonly layer = Layer.effect(
    OuroborosSocket,
    Effect.gen(function*() {
      const getSocket = Effect.fn("OuroborosSocket.getSocket")(function*(_protocolType: "node-to-node" | "node-to-client") {
        // TODO: Implement socket creation using Effect-TS Socket.makeWebSocket or NodeSocket.makeNet
        // For now, this is a placeholder that will be implemented when we refactor the multiplexer
        return yield* Effect.fail(new Socket.SocketError({
          reason: new Socket.SocketOpenError({
            kind: "Unknown",
            cause: new Error("Ouroboros socket adapter not yet implemented")
          })
        }))
      })

      return OuroborosSocket.of({
        getSocket
      })
    })
  )
}
