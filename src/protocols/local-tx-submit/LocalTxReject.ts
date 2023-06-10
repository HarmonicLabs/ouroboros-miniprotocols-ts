import { CanBeCborString, Cbor, CborArray, CborNegInt, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { canBeInteger } from "../types/ints";

export interface ILocalTxReject {
    reason: number | bigint
}

export function isILocalTxReject( stuff: any ): stuff is ILocalTxReject
{
    return isObject( stuff ) && canBeInteger( stuff.reason );
}

export class LocalTxReject
    implements ToCbor, ToCborObj, ILocalTxReject
{
    readonly reason: bigint;

    constructor({ reason }: ILocalTxReject)
    {
        if(!isILocalTxReject({ reason }))
        throw new Error("invalid interface for 'LocalTxReject'");

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

    static fromCbor( cbor: CanBeCborString ): LocalTxReject
    {
        return LocalTxReject.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): LocalTxReject
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2) &&
            (cbor.array[1] instanceof CborUInt || cbor.array[1] instanceof CborNegInt)
        )) throw new Error("invalid CBOR for 'LocalTxReject");

        return new LocalTxReject({
            reason: cbor.array[1].num
        });
    }
}