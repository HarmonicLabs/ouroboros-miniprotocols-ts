import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IChainSyncAwaitReply {};

export function isIChainSyncAwaitReply( stuff: any ): stuff is IChainSyncAwaitReply
{
    return isObject( stuff );
}

export class ChainSyncAwaitReply
    implements ToCbor, ToCborObj, IChainSyncAwaitReply
{
    constructor(
        readonly cborRef: SubCborRef | undefined = undefined
    ){};

    toJSON() { return this.toJson(); }
    toJson() { return {}; }

    toCborBytes(): Uint8Array
    {
        // if( this.cborRef instanceof SubCborRef ) return this.cborRef.toBuffer();
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

    static fromCbor( cbor: CanBeCborString ): ChainSyncAwaitReply
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return ChainSyncAwaitReply.fromCborObj( Cbor.parse( buff ) );
    }
    static fromCborObj( cbor: CborObj ): ChainSyncAwaitReply
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1)
        )) throw new Error("invalid CBOR for 'ChainSyncAwaitReply");

        return new ChainSyncAwaitReply();
    }
}