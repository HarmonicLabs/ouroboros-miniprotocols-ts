import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { hasOwn, isObject } from "@harmoniclabs/obj-utils";

export interface ITxMonitorHasTx {
    txId: Uint8Array
}

export function isITxMonitorHasTx( stuff: any ): stuff is ITxMonitorHasTx
{
    return isObject( stuff ) && ( stuff.txId instanceof Uint8Array );
}

export class TxMonitorHasTx
    implements ToCborString, ToCborObj, ITxMonitorHasTx
{
    readonly txId: Uint8Array;
    
    constructor({ txId }: ITxMonitorHasTx )
    {
        if(!isITxMonitorHasTx({ txId }))
        throw new Error("invalid interface for 'TxMonitorHasTx'");

        this.txId = txId;
    };

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
        return new CborArray([
            new CborUInt( 7 ),
            new CborBytes( this.txId )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorHasTx
    {
        return TxMonitorHasTx.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorHasTx
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(7) &&
            cbor.array[1] instanceof CborBytes
        )) throw new Error("invalid CBOR for 'TxMonitorHasTx");

        return new TxMonitorHasTx({
            txId: cbor.array[1].bytes
        });
    }
}