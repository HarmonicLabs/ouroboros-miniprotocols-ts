import { Effect, Layer, Schema, ServiceMap } from "effect"
import { Cbor, CborObj } from "@harmoniclabs/cbor"

/**
 * CBOR codec service for encoding/decoding protocol messages
 */
export class CborCodec extends ServiceMap.Service<CborCodec, {
  /**
   * Encode a CBOR object to bytes
   */
  encode: (obj: CborObj) => Effect.Effect<Uint8Array, CborCodecError>

  /**
   * Decode bytes to a CBOR object
   */
  decode: (bytes: Uint8Array) => Effect.Effect<CborObj, CborCodecError>

  /**
   * Encode with Schema validation
   */
  encodeValid: <S extends Schema.Top>(obj: unknown, schema: S) => Effect.Effect<Uint8Array, CborCodecError | Schema.SchemaError, S["DecodingServices"]>

  /**
   * Decode with Schema validation
   */
  decodeValid: <S extends Schema.Top>(bytes: Uint8Array, schema: S) => Effect.Effect<S["Type"], CborCodecError | Schema.SchemaError, S["DecodingServices"]>
}>()(
  // The string identifier for the service
  "@harmoniclabs/ouroboros-miniprotocols-ts/CborCodec"
) {
  // Attach a static layer to the service, which will be used to provide an
  // implementation of the service.
  static readonly layer = Layer.effect(
    CborCodec,
    Effect.gen(function*() {
      // Define the service methods using Effect.fn
      const encode = Effect.fn("CborCodec.encode")(function*(obj: CborObj) {
        return yield* Effect.try({
          try: () => Cbor.encode(obj).toBuffer(),
          catch: (error) => new CborCodecError({ cause: error })
        })
      })

      const decode = Effect.fn("CborCodec.decode")(function*(bytes: Uint8Array) {
        return yield* Effect.try({
          try: () => Cbor.parse(bytes),
          catch: (error) => new CborCodecError({ cause: error })
        })
      })

      const encodeValid = Effect.fn("CborCodec.encodeValid")(function*<S extends Schema.Top>(
        obj: unknown,
        schema: S
      ) {
        // First validate the object against the schema
        const validated = yield* Schema.decodeUnknownEffect(schema)(obj)
        // Then encode the validated object
        return yield* Effect.try({
          try: () => Cbor.encode(validated as CborObj).toBuffer(),
          catch: (error) => new CborCodecError({ cause: error })
        })
      })

      const decodeValid = Effect.fn("CborCodec.decodeValid")(function*<S extends Schema.Top>(
        bytes: Uint8Array,
        schema: S
      ) {
        // First decode the CBOR
        const decoded = yield* Effect.try({
          try: () => Cbor.parse(bytes),
          catch: (error) => new CborCodecError({ cause: error })
        })
        // Then validate against the schema
        return yield* Schema.decodeUnknownEffect(schema)(decoded)
      })

      // Return an instance of the service using CborCodec.of, passing in an
      // object that implements the service interface.
      return CborCodec.of({
        encode,
        decode,
        encodeValid,
        decodeValid
      })
    })
  )
}

/**
 * CBOR codec errors
 */
export class CborCodecError extends Schema.ErrorClass<CborCodecError>("CborCodecError")({
  cause: Schema.Defect
}) {}