import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { type } from "os";

export interface ITxMonitorAcquire {}

export function isITxMonitorAcquire( stuff: any ): stuff is ITxMonitorAcquire
{
    return isObject( stuff );
}

export type TxMonitorAwaitAquire = TxMonitorAcquire;

export class TxMonitorAcquire
    implements ToCbor, ToCborObj, ITxMonitorAcquire
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

    static fromCbor( cbor: CanBeCborString ): TxMonitorAcquire
    {
        return TxMonitorAcquire.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorAcquire
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(3)
        )) throw new Error("invalid CBOR for 'TxMonitorAcquire");

        return new TxMonitorAcquire();
    }
}