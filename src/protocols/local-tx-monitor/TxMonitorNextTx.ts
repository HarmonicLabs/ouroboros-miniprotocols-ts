import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ITxMonitorNextTx {}

export function isITxMonitorNextTx( stuff: any ): stuff is ITxMonitorNextTx
{
    return isObject( stuff );
}

export class TxMonitorNextTx
    implements ToCbor, ToCborObj, ITxMonitorNextTx
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(5) ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorNextTx
    {
        return TxMonitorNextTx.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorNextTx
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(5)
        )) throw new Error("invalid CBOR for 'TxMonitorNextTx");

        return new TxMonitorNextTx();
    }
}