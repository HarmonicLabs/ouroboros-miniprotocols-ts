import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { IChainTip, ChainTip, isIChainTip } from "../../types";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

export interface IChainSyncIntersectNotFound {
    tip: IChainTip
}

export class ChainSyncIntersectNotFound
    implements ToCbor, ToCborObj, IChainSyncIntersectNotFound
{
    readonly tip: ChainTip;

    constructor(
        intersect: IChainSyncIntersectNotFound,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { tip } = intersect;
        if(!(
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncIntersectNotFound interface");

        this.tip = tip instanceof ChainTip ? tip : new ChainTip( tip );
        this.cborRef = cborRef ?? subCborRefOrUndef( intersect );
    };

    toJSON() { return this.toJson(); }
    toJson()
    {
        return {
            tip: this.tip.toJson()
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
            new CborUInt(6),
            this.tip.toCborObj()
        ]);
    }
    

    static fromCbor( cbor: CanBeCborString ): ChainSyncIntersectNotFound
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return ChainSyncIntersectNotFound.fromCborObj( Cbor.parse( buff ), buff );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): ChainSyncIntersectNotFound
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(6)
        )) throw new Error("invalid CBOR for 'ChainSyncIntersectNotFound");

        const [ _idx, tipCbor ] = cbor.array;

        return new ChainSyncIntersectNotFound({
            tip: ChainTip.fromCborObj( tipCbor )
        }, getSubCborRef( cbor, originalBytes ));
    }
}