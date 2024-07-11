import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../../types/ChainPoint";

export interface IBlockFetchRequestRange {
    from: IChainPoint,
    to: IChainPoint
}

export class BlockFetchRequestRange
    implements ToCbor, ToCborObj, IBlockFetchRequestRange
{
    readonly from: ChainPoint;
    readonly to: ChainPoint;

    constructor({ from, to }: IBlockFetchRequestRange)
    {
        if(!(
            isIChainPoint( from ) &&
            isIChainPoint( to )
        )) throw new Error("invalid chain points for 'BlockFetchRequestRange'");

        Object.defineProperties(
            this, {
                from: {
                    value: new ChainPoint( from ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                to: {
                    value: new ChainPoint( to ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        )
    }


    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt(0),
            this.from.toCborObj(),
            this.to.toCborObj()
        ]);
    }

    static fromcCbor( cbor: CanBeCborString ): BlockFetchRequestRange
    {
        return BlockFetchRequestRange.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): BlockFetchRequestRange
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
        });
    }
}