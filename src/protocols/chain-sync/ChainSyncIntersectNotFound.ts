import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainTip, IChainTip, isIChainTip } from "../types/ChainTip";
import { getCborBytesDescriptor } from "./utils/getCborBytesDescriptor";

export interface IChainSyncIntersectNotFound {
    tip: IChainTip
}

export class ChainSyncIntersectNotFound
    implements ToCbor, ToCborObj, IChainSyncIntersectNotFound
{
    readonly cborBytes?: Uint8Array | undefined;
    
    readonly tip: ChainTip;

    constructor({ tip }: IChainSyncIntersectNotFound)
    {
        if(!(
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncIntersectNotFound interface");

        Object.defineProperties(
            this, {
                cborBytes: getCborBytesDescriptor(),
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
            tip: this.tip.toJson()
        }
    }

    toCbor(): CborString
    {
        return new CborString( this.toCborBytes() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(6),
            this.tip.toCborObj()
        ]);
    }
    toCborBytes(): Uint8Array
    {
        if(!( this.cborBytes instanceof Uint8Array ))
        {
            // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.
            this.cborBytes = Cbor.encode( this.toCborObj() ).toBuffer();
        }

        return Uint8Array.prototype.slice.call( this.cborBytes );
    }
    

    static fromCbor( cbor: CanBeCborString ): ChainSyncIntersectNotFound
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        const msg = ChainSyncIntersectNotFound.fromCborObj( Cbor.parse( buff ) );
        
        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
    }
    static fromCborObj( cbor: CborObj ): ChainSyncIntersectNotFound
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
        });
    }
}