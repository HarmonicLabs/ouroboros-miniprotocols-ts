import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { canBeUInteger, forceBigUInt, forceUInteger } from "../types/ints";

export interface ITxSubmitRequestIds {
    blocking: boolean,
    knownTxCount: number | bigint
    requestedTxCount: number | bigint
}

export function isITxSubmitRequestIds( stuff: any ): stuff is TxSubmitRequestIds
{
    return isObject( stuff ) && (
        typeof stuff.blocking === "boolean" &&
        canBeUInteger( stuff.knownTxCount ) &&
        canBeUInteger( stuff.requestedTxCount )
    );
}

/**
 * The server requests aviable transactions ids
**/
export class TxSubmitRequestIds
    implements ToCbor, ToCborObj, TxSubmitRequestIds
{
    readonly blocking: boolean

    readonly knownTxCount: number;
    readonly requestedTxCount: number
    
    constructor({ blocking, knownTxCount, requestedTxCount }: ITxSubmitRequestIds)
    {

        Object.defineProperties(
            this, {
                blocking: {
                    value: Boolean( blocking ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                knownTxCount: {
                    value: forceUInteger( knownTxCount ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                requestedTxCount: {
                    value: forceUInteger( requestedTxCount ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
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
            new CborUInt(0),
            new CborUInt(this.knownTxCount),
            new CborUInt(this.requestedTxCount)
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxSubmitRequestIds
    {
        return TxSubmitRequestIds.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitRequestIds
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0) &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[2] instanceof CborUInt
        )) throw new Error("invalid CBOR for 'TxSubmitRequestIds");

        return new TxSubmitRequestIds({
            blocking: false,
            knownTxCount: cbor.array[1].num,
            requestedTxCount: cbor.array[2].num,
        });
    }
}