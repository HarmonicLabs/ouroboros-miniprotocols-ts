import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ILocalTxSubmitDone {}

export function isILocalTxSubmitDone( stuff: any ): stuff is ILocalTxSubmitDone
{
    return isObject( stuff );
}

export class LocalTxSubmitDone
    implements ToCbor, ToCborObj, ILocalTxSubmitDone
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(3) ]);
    }

    static fromCbor( cbor: CanBeCborString ): LocalTxSubmitDone
    {
        return LocalTxSubmitDone.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): LocalTxSubmitDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(3)
        )) throw new Error("invalid CBOR for 'LocalTxSubmitDone");

        return new LocalTxSubmitDone();
    }
}