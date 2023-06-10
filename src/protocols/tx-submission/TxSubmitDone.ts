import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ITxSubmitDone {}

export function isITxSubmitDone( stuff: any ): stuff is ITxSubmitDone
{
    return isObject( stuff );
}

export class TxSubmitDone
    implements ToCbor, ToCborObj, ITxSubmitDone
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(4) ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxSubmitDone
    {
        return TxSubmitDone.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(4)
        )) throw new Error("invalid CBOR for 'TxSubmitDone");

        return new TxSubmitDone();
    }
}