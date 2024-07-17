import { CanBeCborString, Cbor, CborArray, CborNegInt, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { canBeInteger } from "../../types/ints";

export interface ILocalTxSubmitReject {
    reason: number | bigint
}

export function isILocalTxSubmitReject( stuff: any ): stuff is ILocalTxSubmitReject
{
    return isObject( stuff ) && canBeInteger( stuff.reason );
}

export class LocalTxSubmitReject
    implements ToCbor, ToCborObj, ILocalTxSubmitReject
{
    readonly reason: bigint;

    constructor({ reason }: ILocalTxSubmitReject)
    {
        if(!isILocalTxSubmitReject({ reason }))
        throw new Error("invalid interface for 'LocalTxSubmitReject'");

        Object.defineProperty(
            this, "reason", {
                value: typeof reason === "number" ? Math.round( reason ) : BigInt( reason ),
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
    };

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(2),
            this.reason >= 0 ? new CborUInt( this.reason ) : new CborNegInt( this.reason )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): LocalTxSubmitReject
    {
        return LocalTxSubmitReject.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): LocalTxSubmitReject
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2) &&
            (cbor.array[1] instanceof CborUInt || cbor.array[1] instanceof CborNegInt)
        )) throw new Error("invalid CBOR for 'LocalTxSubmitReject");

        return new LocalTxSubmitReject({
            reason: cbor.array[1].num
        });
    }
}