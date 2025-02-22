import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IQryRelease {}

export function isIQryRelease( stuff: any ): stuff is IQryRelease
{
    return isObject( stuff );
}

export class QryRelease
    implements ToCborString, ToCborObj, IQryRelease
{
    constructor() {};

    toJSON() { return this.toJson(); }
    toJson() { return {}; }

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([ new CborUInt(5) ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryRelease
    {
        return QryRelease.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryRelease
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(5)
        )) throw new Error("invalid CBOR for 'QryRelease");

        return new QryRelease();
    }
}