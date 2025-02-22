import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils"
import { assert } from "../../utils/assert";

export interface ITxSubmitRequestTxs 
{
    ids: Uint8Array[]
}

export function isITxSubmitRequestTxs( stuff: any ): stuff is ITxSubmitRequestTxs
{
    return(
        isObject( stuff ) && 
        Array.isArray( stuff.ids ) && 
        stuff.ids.every( ( thing: any ) => thing instanceof Uint8Array )
    );
}

/**
 * Server request of available transactions
**/
export class TxSubmitRequestTxs
    implements ToCborString, ToCborObj, ITxSubmitRequestTxs
{
    readonly ids: Uint8Array[];

    constructor({ ids }: ITxSubmitRequestTxs)
    {
        assert(!isITxSubmitRequestTxs({ ids }), "invalid interface for 'TxSubmitRequestTxs'" );

        this.ids = ids;
    }

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
            new CborUInt( 2 ),
            new CborArray(
                this.ids.map(( id ) => new CborBytes( id )),
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
            cbor.array.length >= 2
        )) throw new Error("invalid CBOR for 'TxSubmitRequestTxs");

        const [ 
            cborMsgTag, 
            cborIds 
        ] = cbor.array;

        if(!(
                cborMsgTag instanceof CborUInt &&
                Number( cborMsgTag.num ) === 2 &&
                cborIds instanceof CborArray
        )) throw new Error("invalid CBOR for 'TxSubmitRequestTxs");

        return new TxSubmitRequestTxs({
            ids: cborIds.array.map( ( id ) => ( id as CborBytes ).bytes )
        });
    }
}
