import { isObject } from "@harmoniclabs/obj-utils";
import { N2CRefuseReasonHandshakeDecodeError } from "./N2CRefuseReasonHandshakeDecodeError";
import { N2CRefuseReasonRefuse } from "./N2CRefuseReasonRefuse";
import { N2CRefuseReasonVersionMismatch } from "./N2CRefuseReasonVersionMismatch";
import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, forceCborString } from "@harmoniclabs/cbor";

export type N2CRefuseReason
    = N2CRefuseReasonVersionMismatch
    | N2CRefuseReasonHandshakeDecodeError
    | N2CRefuseReasonRefuse;

export function isN2CRefuseReason( stuff: any ): stuff is N2CRefuseReason
{
    return (
        isObject( stuff ) &&
        (
            stuff instanceof N2CRefuseReasonVersionMismatch ||
            stuff instanceof N2CRefuseReasonHandshakeDecodeError ||
            stuff instanceof N2CRefuseReasonRefuse
        )
    );
}

export function n2cRefuseReasonToCbor( n2cRefuseReason: N2CRefuseReason ): CborString
{
    return n2cRefuseReason.toCbor();
}
export function n2cRefuseReasonToCborObj( n2cRefuseReason: N2CRefuseReason ): CborArray
{
    return n2cRefuseReason.toCborObj();
}

export function n2cRefuseReasonFromCbor( cbor: CanBeCborString ): N2CRefuseReason
{
    return n2cRefuseReasonFromCborObj( Cbor.parse( forceCborString( cbor ) ) );
}
export function n2cRefuseReasonFromCborObj( cbor: CborObj ): N2CRefuseReason
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length > 0 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for N2CRefuseReason");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return N2CRefuseReasonVersionMismatch.fromCborObj( cbor );
    if( idx === 1 ) return N2CRefuseReasonHandshakeDecodeError.fromCborObj( cbor );
    if( idx === 2 ) return N2CRefuseReasonRefuse.fromCborObj( cbor );
    
    throw new Error("invalid CBOR for N2CRefuseReason; unknown reason index: " + idx)
}