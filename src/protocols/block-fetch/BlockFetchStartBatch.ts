import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IBlockFetchStartBatch {}

export function isIBlockFetchStartBatch( stuff: any ): stuff is IBlockFetchStartBatch
{
    return isObject( stuff );
}

export class BlockFetchStartBatch
    implements ToCbor, ToCborObj, IBlockFetchStartBatch
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(2) ]);
    }

    static fromCbor( cbor: CanBeCborString ): BlockFetchStartBatch
    {
        return BlockFetchStartBatch.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): BlockFetchStartBatch
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2)
        )) throw new Error("invalid CBOR for 'BlockFetchStartBatch");

        return new BlockFetchStartBatch();
    }
}