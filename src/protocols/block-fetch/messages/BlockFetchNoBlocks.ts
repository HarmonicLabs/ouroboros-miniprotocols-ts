import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IBlockFetchNoBlocks {}

export function isIBlockFetchNoBlocks( stuff: any ): stuff is IBlockFetchNoBlocks
{
    return isObject( stuff );
}

export class BlockFetchNoBlocks
    implements ToCbor, ToCborObj, IBlockFetchNoBlocks
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(3) ]);
    }

    static fromCbor( cbor: CanBeCborString ): BlockFetchNoBlocks
    {
        return BlockFetchNoBlocks.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): BlockFetchNoBlocks
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(3)
        )) throw new Error("invalid CBOR for 'BlockFetchNoBlocks");

        return new BlockFetchNoBlocks();
    }
}