import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef } from "../../utils/getSubCborRef";

export interface ITxMonitorNextTx {}

export function isITxMonitorNextTx( stuff: any ): stuff is ITxMonitorNextTx
{
    return isObject( stuff );
}

export class TxMonitorNextTx
    implements ToCborString, ToCborObj, ITxMonitorNextTx
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
        return new CborArray([ new CborUInt(5) ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorNextTx
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
        return TxMonitorNextTx.fromCborObj( Cbor.parse( bytes, { keepRef: true } ), bytes );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): TxMonitorNextTx
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(5)
        )) throw new Error("invalid CBOR for 'TxMonitorNextTx");

        return new TxMonitorNextTx();
    }
}