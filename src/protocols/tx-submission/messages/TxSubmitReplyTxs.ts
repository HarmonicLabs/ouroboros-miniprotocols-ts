import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils"

export interface ITxSubmitReplyTxs {
    txs: Uint8Array[] | readonly Uint8Array[]
}

export function isITxSubmitReplyTx( stuff: any ): stuff is ITxSubmitReplyTxs
{
    return isObject( stuff ) && (
        Array.isArray( stuff.txs ) && stuff.txs.every( (thing: any) => thing instanceof Uint8Array )
    );
}

export class TxSubmitReplyTxs
    implements ToCbor, ToCborObj, ITxSubmitReplyTxs
{
    readonly txs: readonly Uint8Array[];

    constructor({ txs }: ITxSubmitReplyTxs)
    {
        if(!isITxSubmitReplyTx({ txs })) throw new Error("invalid interface for 'TxSubmitReplyTx'");

        this.txs = txs;
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(3),
            new CborArray(
                this.txs.map( id => new CborBytes( id ) ),
                {
                    // CDDL specification comment
                    // ; The codec only accepts infinit-length list encoding for tsIdList!
                    indefinite: true
                }
            )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxSubmitReplyTxs
    {
        return TxSubmitReplyTxs.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitReplyTxs
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(3) &&
            cbor.array[1] instanceof CborArray &&
            cbor.array[1].array.every( thing => thing instanceof CborBytes )
        )) throw new Error("invalid CBOR for 'TxSubmitReplyTx");

        return new TxSubmitReplyTxs({
            txs: cbor.array[1].array.map( id => (id as CborBytes).buffer )
        });
    }
}