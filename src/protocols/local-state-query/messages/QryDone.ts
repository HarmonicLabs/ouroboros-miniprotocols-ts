import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IQryDone {}

export function isIQryDone( stuff: any ): stuff is IQryDone
{
    return isObject( stuff );
}

export class QryDone
    implements ToCbor, ToCborObj, IQryDone
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(7) ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryDone
    {
        return QryDone.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(7)
        )) throw new Error("invalid CBOR for 'QryDone");

        return new QryDone();
    }
}