import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../../types/ChainPoint";
import { ChainTip, IChainTip, isIChainTip } from "../../types/ChainTip";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

export interface IChainSyncIntersectFound {
    point: IChainPoint,
    tip: IChainTip
}

export class ChainSyncIntersectFound
    implements ToCbor, ToCborObj, IChainSyncIntersectFound
{
    readonly point: ChainPoint;
    readonly tip: ChainTip;

    constructor(
        intersect: IChainSyncIntersectFound,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { point, tip } = intersect;
        if(!(
            isIChainPoint( point ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncIntersectFound interface");

        this.point = point instanceof ChainPoint ? point : new ChainPoint( point );
        this.tip = tip instanceof ChainTip ? tip : new ChainTip( tip );
        this.cborRef = cborRef ?? subCborRefOrUndef( intersect );
    };

    toJSON() { return this.toJson(); }
    toJson()
    {
        return {
            point: this.point.toJson(),
            tip: this.tip.toJson()
        };
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
            new CborUInt(5),
            this.point.toCborObj(),
            this.tip.toCborObj()
        ]);
    }
    

    static fromCbor( cbor: CanBeCborString ): ChainSyncIntersectFound
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return ChainSyncIntersectFound.fromCborObj( Cbor.parse( buff ), buff );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): ChainSyncIntersectFound
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(5)
        )) throw new Error("invalid CBOR for 'ChainSyncIntersectFound");

        const [ _idx, pointCbor, tipCbor ] = cbor.array;

        return new ChainSyncIntersectFound({
            point: ChainPoint.fromCborObj( pointCbor ),
            tip: ChainTip.fromCborObj( tipCbor )
        }, getSubCborRef( cbor, originalBytes ));
    }
}