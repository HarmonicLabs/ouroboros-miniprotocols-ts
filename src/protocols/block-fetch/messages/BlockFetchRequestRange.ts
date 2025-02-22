import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../../types/ChainPoint";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

export interface IBlockFetchRequestRange {
    from: IChainPoint,
    to: IChainPoint
}

export class BlockFetchRequestRange
    implements ToCbor, ToCborObj, IBlockFetchRequestRange
{
    readonly from: ChainPoint;
    readonly to: ChainPoint;

    constructor(
        range: IBlockFetchRequestRange,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { from, to } = range;
        if(!(
            isIChainPoint( from ) &&
            isIChainPoint( to )
        )) throw new Error("invalid chain points for 'BlockFetchRequestRange'");

        this.from = from instanceof ChainPoint ? from : new ChainPoint( from );
        this.to = to instanceof ChainPoint ? to : new ChainPoint( to );
        this.cborRef = cborRef ?? subCborRefOrUndef( range );
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
            new CborUInt(0),
            this.from.toCborObj(),
            this.to.toCborObj()
        ]);
    }

    static fromcCbor( cbor: CanBeCborString ): BlockFetchRequestRange
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
        return BlockFetchRequestRange.fromCborObj(
            Cbor.parse( bytes, { keepRef: true } ),
            bytes
        );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): BlockFetchRequestRange
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0)
        )) throw new Error("invalid CBOR for 'BlockFetchRequestRange'");

        const [ _idx, fromCbor, toCbor ] = cbor.array;

        return new BlockFetchRequestRange({
            from: ChainPoint.fromCborObj( fromCbor ),
            to: ChainPoint.fromCborObj( toCbor )
        }, getSubCborRef( cbor, originalBytes ));
    }
}