import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainTip, IChainTip, isIChainTip } from "../types/ChainTip";

export interface IChainSyncIntersectNotFound {
    tip: IChainTip
}

export class ChainSyncIntersectNotFound
    implements ToCbor, ToCborObj, IChainSyncIntersectNotFound
{
    readonly tip: ChainTip;

    constructor({ tip }: IChainSyncIntersectNotFound)
    {
        if(!(
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncIntersectNotFound interface");

        Object.defineProperties(
            this, {
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
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(6),
            this.tip.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncIntersectNotFound
    {
        return ChainSyncIntersectNotFound.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
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