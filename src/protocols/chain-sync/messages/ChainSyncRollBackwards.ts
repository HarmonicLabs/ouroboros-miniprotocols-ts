import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../../types/ChainPoint";
import { ChainTip, IChainTip, isIChainTip } from "../../types/ChainTip";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

export interface IChainSyncRollBackwards {
    point: IChainPoint,
    tip: IChainTip
}

export class ChainSyncRollBackwards
    implements ToCbor, ToCborObj, IChainSyncRollBackwards
{
    readonly point: ChainPoint;
    readonly tip: ChainTip;

    constructor(
        rollback: IChainSyncRollBackwards,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { point, tip } = rollback;
        if(!(
            isIChainPoint( point ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncRollBackwards interface");

        this.point = point instanceof ChainPoint ? point : new ChainPoint( point );
        this.tip = tip instanceof ChainTip ? tip : new ChainTip( tip );
        this.cborRef = cborRef ?? subCborRefOrUndef( rollback );
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
            new CborUInt(3),
            this.point.toCborObj(),
            this.tip.toCborObj()
        ]);
    }
    
    static fromCbor( cbor: CanBeCborString ): ChainSyncRollBackwards
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return ChainSyncRollBackwards.fromCborObj( Cbor.parse( buff ), buff );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): ChainSyncRollBackwards
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(3)
        )) throw new Error("invalid CBOR for 'ChainSyncRollBackwards");

        const [ _idx, pointCbor, tipCbor ] = cbor.array;

        return new ChainSyncRollBackwards({
            point: ChainPoint.fromCborObj( pointCbor ),
            tip: ChainTip.fromCborObj( tipCbor )
        }, getSubCborRef( cbor, originalBytes ));
    }
}