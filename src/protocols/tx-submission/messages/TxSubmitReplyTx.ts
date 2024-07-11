import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils"

export interface ITxSubmitReplyTx {
    txs: Uint8Array[] | readonly Uint8Array[]
}

export function isITxSubmitReplyTx( stuff: any ): stuff is ITxSubmitReplyTx
{
    return isObject( stuff ) && (
        Array.isArray( stuff.txs ) && stuff.txs.every( (thing: any) => thing instanceof Uint8Array )
    );
}

export class TxSubmitReplyTx
    implements ToCbor, ToCborObj, ITxSubmitReplyTx
{
    readonly txs: readonly Uint8Array[];

    constructor({ txs }: ITxSubmitReplyTx)
    {
        if(!isITxSubmitReplyTx({ txs })) throw new Error("invalid interface for 'TxSubmitReplyTx'");

        Object.defineProperty(
            this, "txs", {
                value: Object.freeze( txs.slice() ),
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
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

    static fromCbor( cbor: CanBeCborString ): TxSubmitReplyTx
    {
        return TxSubmitReplyTx.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitReplyTx
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(3) &&
            cbor.array[1] instanceof CborArray &&
            cbor.array[1].array.every( thing => thing instanceof CborBytes )
        )) throw new Error("invalid CBOR for 'TxSubmitReplyTx");

        return new TxSubmitReplyTx({
            txs: cbor.array[1].array.map( id => (id as CborBytes).buffer )
        });
    }
}