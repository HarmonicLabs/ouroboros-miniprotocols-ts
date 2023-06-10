import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ITxMonitorGetSizes {}

export function isITxMonitorGetSizes( stuff: any ): stuff is ITxMonitorGetSizes
{
    return isObject( stuff );
}

export class TxMonitorGetSizes
    implements ToCbor, ToCborObj, ITxMonitorGetSizes
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

    static fromCbor( cbor: CanBeCborString ): TxMonitorGetSizes
    {
        return TxMonitorGetSizes.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorGetSizes
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(3)
        )) throw new Error("invalid CBOR for 'TxMonitorGetSizes");

        return new TxMonitorGetSizes();
    }
}