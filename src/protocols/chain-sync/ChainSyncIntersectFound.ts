import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../types/ChainPoint";
import { ChainTip, IChainTip, isIChainTip } from "../types/ChainTip";
import { getCborBytesDescriptor } from "./utils/getCborBytesDescriptor";

export interface IChainSyncIntersectFound {
    point: IChainPoint,
    tip: IChainTip
}

export class ChainSyncIntersectFound
    implements ToCbor, ToCborObj, IChainSyncIntersectFound
{
    readonly cborBytes?: Uint8Array | undefined;
    
    readonly point: ChainPoint;
    readonly tip: ChainTip;

    constructor({ point, tip }: IChainSyncIntersectFound)
    {
        if(!(
            isIChainPoint( point ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncIntersectFound interface");

        Object.defineProperties(
            this, {
                cborBytes: getCborBytesDescriptor(),
                point: {
                    value: new ChainPoint( point ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                tip: {
                    value: new ChainTip( tip ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    };

    toJson()
    {
        return {
            point: this.point.toJson(),
            tip: this.tip.toJson()
        };
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
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
            
        const msg = ChainSyncIntersectFound.fromCborObj( Cbor.parse( buff ) );

        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
    }
    static fromCborObj( cbor: CborObj ): ChainSyncIntersectFound
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
        });
    }
}