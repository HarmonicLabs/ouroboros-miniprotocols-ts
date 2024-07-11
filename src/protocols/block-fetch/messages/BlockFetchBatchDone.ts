import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IBlockFetchBatchDone {}

export function isIBlockFetchBatchDone( stuff: any ): stuff is IBlockFetchBatchDone
{
    return isObject( stuff );
}

export class BlockFetchBatchDone
    implements ToCbor, ToCborObj, IBlockFetchBatchDone
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(5) ]);
    }

    static fromCbor( cbor: CanBeCborString ): BlockFetchBatchDone
    {
        return BlockFetchBatchDone.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): BlockFetchBatchDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(5)
        )) throw new Error("invalid CBOR for 'BlockFetchBatchDone");

        return new BlockFetchBatchDone();
    }
}