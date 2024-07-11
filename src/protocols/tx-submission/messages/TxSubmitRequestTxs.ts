import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils"

export interface ITxSubmitRequestTxs {
    ids: Uint8Array[] | readonly Uint8Array[]
}

export function isITxSubmitRequestTxs( stuff: any ): stuff is ITxSubmitRequestTxs
{
    return isObject( stuff ) && (
        Array.isArray( stuff.ids ) && stuff.ids.every( (thing: any) => thing instanceof Uint8Array )
    );
}

export class TxSubmitRequestTxs
    implements ToCbor, ToCborObj, ITxSubmitRequestTxs
{
    readonly ids: readonly Uint8Array[];

    constructor({ ids }: ITxSubmitRequestTxs)
    {
        if(!isITxSubmitRequestTxs({ ids })) throw new Error("invalid interface for 'TxSubmitRequestTxs'");

        Object.defineProperty(
            this, "ids", {
                value: Object.freeze( ids.slice() ),
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
            new CborUInt(2),
            new CborArray(
                this.ids.map( id => new CborBytes( id ) ),
                {
                    // CDDL specification comment
                    // ; The codec only accepts infinit-length list encoding for tsIdList!
                    indefinite: true
                }
            )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxSubmitRequestTxs
    {
        return TxSubmitRequestTxs.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitRequestTxs
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2) &&
            cbor.array[1] instanceof CborArray &&
            cbor.array[1].array.every( thing => thing instanceof CborBytes )
        )) throw new Error("invalid CBOR for 'TxSubmitRequestTxs");

        return new TxSubmitRequestTxs({
            ids: cbor.array[1].array.map( id => (id as CborBytes).buffer )
        });
    }
}