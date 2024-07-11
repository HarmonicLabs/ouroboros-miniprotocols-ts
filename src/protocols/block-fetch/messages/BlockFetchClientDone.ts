import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IBlockFetchClientDone {}

export function isIBlockFetchClientDone( stuff: any ): stuff is IBlockFetchClientDone
{
    return isObject( stuff );
}

export class BlockFetchClientDone
    implements ToCbor, ToCborObj, IBlockFetchClientDone
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(1) ]);
    }

    static fromCbor( cbor: CanBeCborString ): BlockFetchClientDone
    {
        return BlockFetchClientDone.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): BlockFetchClientDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1)
        )) throw new Error("invalid CBOR for 'BlockFetchClientDone");

        return new BlockFetchClientDone();
    }
}