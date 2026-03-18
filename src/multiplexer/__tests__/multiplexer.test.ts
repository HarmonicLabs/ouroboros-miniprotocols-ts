import { Effect } from "effect"
import { it, describe, layer } from "@effect/vitest"
import { fromHex } from "@harmoniclabs/uint8array-utils"
import { wrap_multiplexer_message, unwrap_multiplexer_message } from "wasm-plexer"
import { MultiplexerBufferLive, MultiplexerBuffer } from "../Buffer"
import { MiniProtocol } from "../../MiniProtocol"

describe("Multiplexer", () => {
  describe("MultiplexerBuffer", () => {
    layer(MultiplexerBufferLive)("buffer", (it) => {
      it.effect("should append chunk and process frames", () =>
        Effect.gen(function* () {
          const buffer = yield* MultiplexerBuffer

          // Test data from legacy test (truncated for brevity)
          const chunk1 = fromHex("81ff9a7180030bde81028204d8185903ed820284828f183c1a00015298582030051ffec49f3601b3caebeb1071139c22f9e2328cd09e6ec6aabd4374fde4e65820d1a8de6caa8fd9b175c59862ecdd5abcd0477b84b82a0e52faecc6b3c85100a4582051995f616f8a025f974b20330a53c0c81e8ea95973d73d15fff7bab57589311d825840d71436fa5baff6f423ccf7e39b85aef6f1b01812940cac3d97d5c4ff58c7230fddef7f47780d9b9584f55b915f586dc25aad8b1ad1fa5793364e198d956bbf5a5850523cc201ff6284f492a3a4c1a16b5eb01f49b1f2cf6a6fc8cae97cd83cdaf230f9bd032e0830611b3c8c36b0875121f25ebddc9ced34aa894ff4ee1b93cdb74cb4c3fbd1c6f1f4cd0f7d0412966a020b8258408c5443d85da1aa4a90d41d4f642a1dedcca66bae564dc6fe752fbf8e6fc2bd0feee404befa96de4228ca50ee33b37257127ed6ec07f3010e41f6d3241fdb5f865850e765e492fbfaeca77f1618c55bdc4cbfa14421112317cf846214c9384aaa7b0313645dbbe25d45366ec3549ffd4aee081a2f84752ab4ceea05f81000cd809cfcbec2c4e408591175149e0cf4535268060358201033376be025cb705fd8dd02eda11cc73975a062b5d14ffd74d6ff69e69a2ff758202b9a5add912f3edc5c325d6250b9cc154de8f35e2924f5b1c707a4123808d064000058407fb060b885ffc7b55bb6e095ea6999eaa5608b6b4e92f5cc64bc34ba85000ebe42839432f15d86df07740374f69ce60f72feb16a0d47f5cf2c43158caf37ad0303005901c02a0098675c6096516a92d82b6a975965fba35e339bc7483f3569d258779c30db9a6349cda5c995a8fd9b643f66029e994343e82a254c418ebb59b8966fefc20734d42d5ecf181026f436173ad3036d5be2ba595f5facf920bcb48e8fd8b7b5fbf4f8fad5e652fd99be5d322fe920e702cc4afd218d76bd6800812155d8012c8fd57538a7b9d64f2defee3e32879e36db649a934b00784e6223023bdfffa59f4e54609d63a6f5ad04850c419a3556db8b291b90467fadfc67194a3069ef6ff4c0f7d6677145ceb51be68d6d0c20d0e92f80313c48dabf5ae8e3acd9fc43f450874848221f71d2f895c18790082d17467de32ff047a22cee1799db7e77e651a35c15b32d4f838133cc80d467308587ff5cea12be5b3b8b7d2d0d2eadf066b67cd965100555f96457d0d70988ffc2a7c212afa73338df3ece84ee7de2170aadec1dafc360580432193ab2a25c9c4555e57bc0d88cf50d7036378b4dabde79e5f858539a464e0a547660374da91d7d19acd753e219a8fee41a43bd4190db235dc0b1224bcfb9a760fb2b39063dccce88453043c0297cb6c93bca145a9ebbd6bc3a916ed943934")
          const chunk2 = fromHex("721ebd2a681c9ae662d7bc0323c4de07a60f4869418481710d612ff36057e60fcce5c699491b0db6f9e2e91685f20adbc070433386499a355c80b90c590c6d1c7c5d03899db933d315a8743328099e3c19665fa5eb20dd929abe28d9b99e719f69e8f35c767e235a4cd3dc3a24935797191686979d13e069cd509fefaaf2d7e4dcd0222f3f921997ed111e470c2d896ecb1b4888a1ad551c8e4724ba37e9d95e10c2b68080a081ff9c3d80031bae8204d8185903ed820284828f183f1a000152d4582032d906e15e3492a64ff98c1130848c23bf346c88cee0dbc306d6245cfca0c8765820618b625df30de53895ff29e7a3770dca56c2ff066d4aa05a6971905deecef6db5820707a5e99ceec213eb56768da310566da8f4ff56cbdd90431ebd0ae17f6c8cc8b825840f3947e4053cac21f4dfdb6ec7d0370833c145ea94eecb27441ca77132153d5e040112043fa6ca03cc96f67f7c6ed73a7784c2f40e941fccb87aa2ffb94c6c5d15850199b6f2a87c6bab101c50996be169c1659ea2e3269893bc4724685f12b0fbe873f4b2c2db2196bb111cbc8d42416f058e7fccfe4fd449d774b95df2ca6fabec80973ca76e68c3dac474f8ce9278f2c0a8258406c2dd5633a090d7907e7aed62ee875fd69b926584c6967e41fe456b84a5e0e720117a29fe2cbbcb0782baa95394f17933174c53b1292f82e43101e7d7357b8c058508bfe3a67ab2afe0db74cea6adecbc87a890576cc6f4158da064e7cc0864def2d1abe13eb9fb8375831e41a0c0c5da71c16d0c0d26d108baba134e6b59f5224c0df9e604c68158e3e803d8dcf3f25fc050358201033376be025cb705fd8dd02eda11cc73975a062b5d14ffd74d6ff69e69a2ff7582005424ee48b0616cdbd5bc631ed25a628518575912c22c6dfea7e2778aac12bba000058404fa969b5356abab0a3c8a42007a3ab177d17aebdf4bedd93a541f545544a01dbb6e2696ef58ee8cf96c214717a4ebd35f2fa992d5815db01382f1bd516a38c0503005901c0978e1f3d6beee24a40edb21bc642dd16aa8955bd69fdce74b14fbbf03f9267dca49542a4149f9a5c4f4c506e0b6eef20a676d640d011289e79edd8e9d6e9fd0cdb583a4dca644ccb0b61eb1e9ecb5f137762436478a69380b192024caf935311673cb5ad6db37f46f59fba1b2f4118def517762e0fa0b1dbc37ff3e607ab5a2b457357d4ca71f38ed7e84fbd03007c61f32f2f070c0dd667ca678c727d83fdadbf4b7799b5f31b1285ca83758a388bcfcabeff17be1429a5df112cb5ba90f6799ba5091ce00397cd56ed509a875c177cc8b8b52b5e1bdba6aa414d966c5c6fd20b05a932284ca9902735bf350c0eda9af447beaad02703960b427a7368bb73b38")

          yield* buffer.appendChunk(chunk1)
          yield* buffer.appendChunk(chunk2)

          const frames = yield* buffer.processedFrames()

          // Assert that frames were processed (basic check)
          expect(frames.length).toBeGreaterThan(0)
          // More specific assertions could be added based on expected frame content
        })
      )

      it.effect("buffer length should be correct", () =>
        Effect.gen(function* () {
          const buffer = yield* MultiplexerBuffer

          const initialLen = yield* buffer.bufferLen()
          expect(initialLen).toBe(0)

          const chunk = new Uint8Array([1, 2, 3])
          yield* buffer.appendChunk(chunk)

          const len = yield* buffer.bufferLen()
          expect(len).toBe(3)
        })
      )
    })
  })

  describe("Message Functions", () => {
    it("should wrap and unwrap multiplexer messages", () => {
      const payload = new Uint8Array([1, 2, 3, 4, 5])
      const protocol = MiniProtocol.Handshake
      const hasAgency = true

      const wrapped = wrap_multiplexer_message(payload, protocol, hasAgency)
      expect(wrapped).toBeInstanceOf(Uint8Array)
      expect(wrapped.length).toBeGreaterThan(payload.length)

      const unwrapped = unwrap_multiplexer_message(wrapped)
      expect(unwrapped.header.protocol).toBe(protocol)
      expect(unwrapped.header.hasAgency).toBe(hasAgency)
      expect(unwrapped.payload).toEqual(payload)
    })

    it("should handle invalid messages", () => {
      const invalid = new Uint8Array([1, 2]) // Too short

      expect(() => unwrap_multiplexer_message(invalid)).toThrow()
    })
  })
})