import { CanBeCborString, Cbor, forceCborString, CborObj, CborArray, CborUInt, CborBytes } from "@harmoniclabs/cbor";
import { ChainPoint, IBlockHeaderHash, IChainPoint, IRealPoint, isOriginPoint } from "./ChainPoint";

export class RealPoint extends ChainPoint
    implements IRealPoint
{
    readonly blockHeader!: IBlockHeaderHash;

    constructor( point: IRealPoint )
    {
        if( isOriginPoint( point ) )
        throw new Error("'RealPoint' cannot be origin");
        super( point );
    }

    static fromCbor( cbor: CanBeCborString ): RealPoint
    {
        return RealPoint.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): RealPoint
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'ChainPoint'");

        if( cbor.array.length < 2 ) 
        throw new Error("'RealPoint' cannot be origin; while parsing cbor");

        const [ slot, hash ] = cbor.array;

        if(!(
            slot instanceof CborUInt &&
            hash instanceof CborBytes
        )) throw new Error("invalid CBOR for 'ChainPoint'");

        return new RealPoint({
            blockHeader: {
                slotNumber: slot.num,
                hash: hash.buffer
            }
        });
    }
}