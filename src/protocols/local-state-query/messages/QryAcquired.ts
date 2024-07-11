import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IQryAcquired {}

export function isIQryAcquired( stuff: any ): stuff is IQryAcquired
{
    return isObject( stuff );
}

export class QryAcquired
    implements ToCbor, ToCborObj, IQryAcquired
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(1) ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryAcquired
    {
        return QryAcquired.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryAcquired
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1)
        )) throw new Error("invalid CBOR for 'QryAcquired");

        return new QryAcquired();
    }
}