import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils"
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

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

    constructor(
        msg: ITxSubmitReplyTxs,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const txs = msg.txs;
        if(!isITxSubmitReplyTx({ txs })) throw new Error("invalid interface for 'TxSubmitReplyTx'");

        this.txs = txs;
        this.cborRef = cborRef ?? subCborRefOrUndef( msg );
    }

    toCborBytes(): Uint8Array
    {
        if( this.cborRef instanceof SubCborRef ) return this.cborRef.toBuffer();
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        if( this.cborRef instanceof SubCborRef ) return new CborString( this.cborRef.toBuffer() );
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        if( this.cborRef instanceof SubCborRef ) return Cbor.parse( this.cborRef.toBuffer() ) as CborArray;
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
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
        return TxSubmitReplyTxs.fromCborObj( Cbor.parse( bytes, { keepRef: true } ), bytes );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): TxSubmitReplyTxs
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
            txs: cbor.array[1].array.map( id => (id as CborBytes).bytes )
        }, getSubCborRef( cbor, originalBytes ));
    }
}