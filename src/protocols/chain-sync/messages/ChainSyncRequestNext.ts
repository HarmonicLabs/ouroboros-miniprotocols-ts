import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IChainSyncRequestNext{}

export function isIChainSyncRequestNext( stuff: any ): stuff is IChainSyncRequestNext
{
    return isObject( stuff );
}

export class ChainSyncRequestNext
    implements ToCbor, ToCborObj, IChainSyncRequestNext
{
    readonly cborRef: SubCborRef | undefined = undefined;
    constructor()
    {
    };

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
        return new CborArray([ new CborUInt(0) ]);
    }
    

    static fromCbor( cbor: CanBeCborString ): ChainSyncRequestNext
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();

        return ChainSyncRequestNext.fromCborObj( Cbor.parse( buff ), buff );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): ChainSyncRequestNext
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0)
        )) throw new Error("invalid CBOR for 'ChainSyncRequestNext");

        return new ChainSyncRequestNext();
    }
}