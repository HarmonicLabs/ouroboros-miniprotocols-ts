import { isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, forceCborString } from "@harmoniclabs/cbor";
import { RefuseReasonHandshakeDecodeError } from "./RefuseReasonHandshakeDecodeError";
import { RefuseReasonRefuse } from "./RefuseReasonRefuse";
import { RefuseReasonVersionMismatch } from "./RefuseReasonVersionMismatch";

export type RefuseReason
    = RefuseReasonVersionMismatch
    | RefuseReasonHandshakeDecodeError
    | RefuseReasonRefuse;

export function isRefuseReason( stuff: any ): stuff is RefuseReason
{
    return (
        isObject( stuff ) &&
        (
            stuff instanceof RefuseReasonVersionMismatch ||
            stuff instanceof RefuseReasonHandshakeDecodeError ||
            stuff instanceof RefuseReasonRefuse
        )
    );
}

export function refuseReasonToCbor( refuseReason: RefuseReason ): CborString
{
    return refuseReason.toCbor();
}
export function refuseReasonToCborObj( refuseReason: RefuseReason ): CborArray
{
    return refuseReason.toCborObj();
}

export function refuseReasonFromCbor( cbor: CanBeCborString, n2n: boolean = true ): RefuseReason
{
    return refuseReasonFromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
}
export function refuseReasonFromCborObj( cbor: CborObj, n2n: boolean = true ): RefuseReason
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length > 0 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for RefuseReason");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return RefuseReasonVersionMismatch.fromCborObj( cbor, n2n );
    if( idx === 1 ) return RefuseReasonHandshakeDecodeError.fromCborObj( cbor, n2n );
    if( idx === 2 ) return RefuseReasonRefuse.fromCborObj( cbor, n2n );
    
    throw new Error("invalid CBOR for RefuseReason; unknown reason index: " + idx)
}