import { CanBeCborString, Cbor, CborArray, CborObj, CborSimple, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ITxMonitorReplyHasTx {
    hasTx: boolean
}

export function isITxMonitorReplyHasTx( stuff: any ): stuff is ITxMonitorReplyHasTx
{
    return isObject( stuff ) && ( typeof stuff.hasTx === "boolean" );
}

export class TxMonitorReplyHasTx
    implements ToCborString, ToCborObj, ITxMonitorReplyHasTx
{
    readonly hasTx: boolean;
    
    constructor({ hasTx }: ITxMonitorReplyHasTx )
    {
        if(!isITxMonitorReplyHasTx({ hasTx }))
        throw new Error("invalid interface for 'TxMonitorReplyHasTx'");

        this.hasTx = hasTx;
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
            new CborUInt( 8 ),
            new CborSimple( this.hasTx )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorReplyHasTx
    {
        return TxMonitorReplyHasTx.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorReplyHasTx
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(8) &&
            cbor.array[1] instanceof CborSimple &&
            typeof cbor.array[1].simple === "boolean"
        )) throw new Error("invalid CBOR for 'TxMonitorReplyHasTx");

        return new TxMonitorReplyHasTx({
            hasTx: cbor.array[1].simple
        });
    }
}