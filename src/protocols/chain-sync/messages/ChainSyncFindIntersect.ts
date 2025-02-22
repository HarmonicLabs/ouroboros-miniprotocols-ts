import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../../types/ChainPoint";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

export interface IChainSyncFindIntersect {
    points: readonly IChainPoint[]
}

export class ChainSyncFindIntersect
    implements ToCbor, ToCborObj, IChainSyncFindIntersect
{
    readonly points: readonly ChainPoint[];

    constructor(
        ask: IChainSyncFindIntersect,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { points } = ask;
        if(!(
            Array.isArray( points ) && points.every( isIChainPoint )
        )) throw new Error("invalid IMessageFindIntesect interface");

        this.points = points.map( p => p instanceof ChainPoint ? p : new ChainPoint( p ) );
        this.cborRef = cborRef ?? subCborRefOrUndef( ask );
    }

    toJSON() { return this.toJson(); }
    toJson()
    {
        return {
            points: this.points.map( p => p.toJson() )
        }
    }

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
        return new CborArray([
            new CborUInt( 4 ),
            new CborArray( this.points.map( p => p.toCborObj() ) )
        ])
    }
    

    static fromCbor( cbor: CanBeCborString ): ChainSyncFindIntersect
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return ChainSyncFindIntersect.fromCborObj( Cbor.parse( buff ), buff );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): ChainSyncFindIntersect
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(4) &&
            cbor.array[1] instanceof CborArray
        )) throw new Error("invalid CBOR for 'ChainSyncAwaitReply");

        const pointsCbor = cbor.array[1].array;

        return new ChainSyncFindIntersect({
            points: pointsCbor.map( ChainPoint.fromCborObj )
        }, getSubCborRef( cbor, originalBytes ));
    }
}