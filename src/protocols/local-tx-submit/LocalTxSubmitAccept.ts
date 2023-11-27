import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ILocalTxSubmitAccept {}

export function isILocalTxSubmitAccept( stuff: any ): stuff is ILocalTxSubmitAccept
{
    return isObject( stuff );
}

export class LocalTxSubmitAccept
    implements ToCbor, ToCborObj, ILocalTxSubmitAccept
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

    static fromCbor( cbor: CanBeCborString ): LocalTxSubmitAccept
    {
        return LocalTxSubmitAccept.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): LocalTxSubmitAccept
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1)
        )) throw new Error("invalid CBOR for 'LocalTxSubmitAccept");

        return new LocalTxSubmitAccept();
    }
}