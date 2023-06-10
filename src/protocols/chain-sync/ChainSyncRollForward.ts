import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { ChainTip, IChainTip, isIChainTip } from "../types/ChainTip";

export interface IChainSyncRollForward {
    blockHeaderCbor: CborObj,
    tip: IChainTip
}

export class ChainSyncRollForward
    implements ToCbor, ToCborObj, IChainSyncRollForward
{
    readonly blockHeaderCbor: CborObj;
    readonly tip: ChainTip;

    constructor({ blockHeaderCbor, tip }: IChainSyncRollForward)
    {
        if(!(
            isCborObj( blockHeaderCbor ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncRollForward interface");

        Object.defineProperties(
            this, {
                blockHeaderCbor: {
                    value: blockHeaderCbor,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                tip: {
                    value: tip instanceof ChainTip ? tip : new ChainTip( tip ),
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
            blockHeaderCbor: Cbor.encode( this.blockHeaderCbor ).toString(),
            tip: this.tip.toJson()
        };
    }

    toString(): string
    {
        return `(roll forward: (header: ${Cbor.encode(this.blockHeaderCbor).toString()}) ${this.tip.toString()} )`
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(2),
            this.blockHeaderCbor,
            this.tip.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncRollForward
    {
        return ChainSyncRollForward.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): ChainSyncRollForward
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2)
        )) throw new Error("invalid CBOR for 'ChainSyncRollForward");

        const [ _idx, headerCbor, tipCbor ] = cbor.array;

        return new ChainSyncRollForward({
            blockHeaderCbor: headerCbor,
            tip: ChainTip.fromCborObj( tipCbor )
        });
    }
}