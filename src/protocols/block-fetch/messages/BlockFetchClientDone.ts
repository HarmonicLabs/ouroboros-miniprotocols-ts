import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IBlockFetchClientDone {}

export function isIBlockFetchClientDone( stuff: any ): stuff is IBlockFetchClientDone
{
    return isObject( stuff );
}

export class BlockFetchClientDone
    implements ToCbor, ToCborObj, IBlockFetchClientDone
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