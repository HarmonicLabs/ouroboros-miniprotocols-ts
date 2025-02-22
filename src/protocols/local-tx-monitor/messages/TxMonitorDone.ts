import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ITxMonitorDone {}

export function isITxMonitorDone( stuff: any ): stuff is ITxMonitorDone
{
    return isObject( stuff );
}

export class TxMonitorDone
    implements ToCborString, ToCborObj, ITxMonitorDone
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
        return new CborArray([ new CborUInt(0) ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorDone
    {
        return TxMonitorDone.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0)
        )) throw new Error("invalid CBOR for 'TxMonitorDone");

        return new TxMonitorDone();
    }
}