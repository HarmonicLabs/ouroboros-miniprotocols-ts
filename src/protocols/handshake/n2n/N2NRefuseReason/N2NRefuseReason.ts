import { isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, forceCborString } from "@harmoniclabs/cbor";
import { N2NRefuseReasonHandshakeDecodeError } from "./N2NRefuseReasonHandshakeDecodeError";
import { N2NRefuseReasonRefuse } from "./N2NRefuseReasonRefuse";
import { N2NRefuseReasonVersionMismatch } from "./N2NRefuseReasonVersionMismatch";

export type N2NRefuseReason
    = N2NRefuseReasonVersionMismatch
    | N2NRefuseReasonHandshakeDecodeError
    | N2NRefuseReasonRefuse;

export function isN2NRefuseReason( stuff: any ): stuff is N2NRefuseReason
{
    return (
        isObject( stuff ) &&
        (
            stuff instanceof N2NRefuseReasonVersionMismatch ||
            stuff instanceof N2NRefuseReasonHandshakeDecodeError ||
            stuff instanceof N2NRefuseReasonRefuse
        )
    );
}

export function n2nRefuseReasonToCbor( n2nRefuseReason: N2NRefuseReason ): CborString
{
    return n2nRefuseReason.toCbor();
}
export function n2nRefuseReasonToCborObj( n2nRefuseReason: N2NRefuseReason ): CborArray
{
    return n2nRefuseReason.toCborObj();
}

export function n2nRefuseReasonFromCbor( cbor: CanBeCborString ): N2NRefuseReason
{
    return n2nRefuseReasonFromCborObj( Cbor.parse( forceCborString( cbor ) ) );
}
export function n2nRefuseReasonFromCborObj( cbor: CborObj ): N2NRefuseReason
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length > 0 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for N2NRefuseReason");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return N2NRefuseReasonVersionMismatch.fromCborObj( cbor );
    if( idx === 1 ) return N2NRefuseReasonHandshakeDecodeError.fromCborObj( cbor );
    if( idx === 2 ) return N2NRefuseReasonRefuse.fromCborObj( cbor );
    
    throw new Error("invalid CBOR for N2NRefuseReason; unknown reason index: " + idx)
}