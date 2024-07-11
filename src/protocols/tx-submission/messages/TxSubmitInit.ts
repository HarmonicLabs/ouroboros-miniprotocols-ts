import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ITxSubmitInit {}

export function isITxSubmitInit( stuff: any ): stuff is ITxSubmitInit
{
    return isObject( stuff );
}

export class TxSubmitInit
    implements ToCbor, ToCborObj, ITxSubmitInit
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(6) ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxSubmitInit
    {
        return TxSubmitInit.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitInit
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(6)
        )) throw new Error("invalid CBOR for 'TxSubmitInit");

        return new TxSubmitInit();
    }
}