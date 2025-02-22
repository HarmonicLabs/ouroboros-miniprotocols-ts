import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ITxSubmitInit {}

export function isITxSubmitInit( stuff: any ): stuff is ITxSubmitInit
{
    return isObject( stuff );
}

export class TxSubmitInit
    implements ToCborString, ToCborObj, ITxSubmitInit
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