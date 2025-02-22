import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IBlockFetchBatchDone {}

export function isIBlockFetchBatchDone( stuff: any ): stuff is IBlockFetchBatchDone
{
    return isObject( stuff );
}

export class BlockFetchBatchDone
    implements ToCbor, ToCborObj, IBlockFetchBatchDone
{
    readonly cborRef: SubCborRef | undefined = undefined;
    constructor() {};

    toJSON() { return this.toJson(); }
    toJson() { return {}; }

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