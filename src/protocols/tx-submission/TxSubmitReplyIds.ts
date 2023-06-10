import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { canBeUInteger, forceBigUInt, forceUInteger } from "../types/ints";

export interface ITxIdAndSize {
    txId: Uint8Array,
    txSize: number | bigint
}

export function isITxIdAndSize( stuff: any ): stuff is ITxIdAndSize
{
    return isObject( stuff ) && (
        stuff.txId instanceof Uint8Array &&
        canBeUInteger( stuff.txSize )
    );
}

export function txIdAndSizeToCborObj({ txId, txSize }: ITxIdAndSize ): CborArray
{
    return new CborArray([
        new CborBytes( txId ),
        new CborUInt( txSize )
    ]);
}

export function txIdAndSizeFromCborObj( cbor: CborObj ): ITxIdAndSize
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 2 &&
        cbor.array[0] instanceof CborBytes &&
        cbor.array[1] instanceof CborUInt
    ))
    throw new Error("invalid CBOR for 'ITxIdAndSize'");

    return {
        txId: cbor.array[0].buffer,
        txSize: cbor.array[1].num
    };
}

export interface ITxSubmitReplyIds {
    response: ITxIdAndSize[] 
}

export function isITxSubmitReplyIds( stuff: any ): stuff is TxSubmitReplyIds
{
    return isObject( stuff ) && (
        typeof stuff.blocking === "boolean" &&
        Array.isArray( stuff.response ) && stuff.response.every( isITxIdAndSize )
    );
}

/**
 * The server requests aviable transactions ids
**/
export class TxSubmitReplyIds
    implements ToCbor, ToCborObj, TxSubmitReplyIds
{
    readonly response: readonly Readonly<ITxIdAndSize>[]
    
    constructor({ response }: ITxSubmitReplyIds)
    {
        if(!(
            Array.isArray( response ) &&
            response.every( isITxIdAndSize )
        )) throw new Error("invalid interface for 'TxSubmitReplyIds'")

        Object.defineProperties(
            this, {
                response: {
                    value: Object.freeze( response.map( Object.freeze ) ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        )
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(1),
            new CborArray( this.response.map( txIdAndSizeToCborObj ) )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxSubmitReplyIds
    {
        return TxSubmitReplyIds.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitReplyIds
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1) &&
            cbor.array[1] instanceof CborArray
        )) throw new Error("invalid CBOR for 'TxSubmitReplyIds");

        return new TxSubmitReplyIds({
            response: cbor.array[1].array.map( txIdAndSizeFromCborObj )
        });
    }
}