import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "../types/ChainPoint";
import { ChainTip, IChainTip, isIChainTip } from "../types/ChainTip";

export interface IChainSyncRollBackwards {
    point: IChainPoint,
    tip: IChainTip
}

export class ChainSyncRollBackwards
    implements ToCbor, ToCborObj, IChainSyncRollBackwards
{
    readonly point: ChainPoint;
    readonly tip: ChainTip;

    constructor({ point, tip }: IChainSyncRollBackwards)
    {
        if(!(
            isIChainPoint( point ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncRollBackwards interface");

        Object.defineProperties(
            this, {
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
            new CborUInt(3),
            this.point.toCborObj(),
            this.tip.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncRollBackwards
    {
        return ChainSyncRollBackwards.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): ChainSyncRollBackwards
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
        });
    }
}