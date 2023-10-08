import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../types/ChainPoint";
import { getCborBytesDescriptor } from "./utils/getCborBytesDescriptor";

export interface IChainSyncFindIntersect {
    points: readonly IChainPoint[]
}

export class ChainSyncFindIntersect
    implements ToCbor, ToCborObj, IChainSyncFindIntersect
{
    readonly cborBytes?: Uint8Array | undefined;
    
    readonly points: readonly ChainPoint[];

    constructor({ points }: IChainSyncFindIntersect)
    {
        if(!(
            Array.isArray( points ) && points.every( isIChainPoint )
        )) throw new Error("invalid IMessageFindIntesect interface");

        Object.defineProperty(
            this, "points", {
                value: Object.freeze( points.map( p => new ChainPoint( p ) ) ),
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
        Object.defineProperty(
            this, "cborBytes", getCborBytesDescriptor()
        );
    }

    toJson()
    {
        return {
            points: this.points.map( p => p.toJson() )
        }
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
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
            
        const msg = ChainSyncFindIntersect.fromCborObj( Cbor.parse( buff ) );

        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
    }
    static fromCborObj( cbor: CborObj ): ChainSyncFindIntersect
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
        });
    }
}