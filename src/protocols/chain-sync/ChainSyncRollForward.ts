import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { ChainTip, IChainTip, isIChainTip } from "../types/ChainTip";
import { getCborBytesDescriptor } from "./utils/getCborBytesDescriptor";

export interface IChainSyncRollForward {
    blockData: CborObj
    /** @deprecated */
    blockHeaderCbor?: CborObj,
    tip: IChainTip
}

export class ChainSyncRollForward
    implements ToCbor, ToCborObj, IChainSyncRollForward
{
    readonly cborBytes?: Uint8Array | undefined;

    readonly blockData: CborObj;
    /** @deprecated */
    readonly blockHeaderCbor: CborObj;
    readonly tip: ChainTip;

    constructor({ blockData, tip }: IChainSyncRollForward)
    {
        if(!(
            isCborObj( blockData ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncRollForward interface");

        let _cborBytes: Uint8Array | undefined = undefined;
        
        Object.defineProperties(
            this, {
                cborBytes: getCborBytesDescriptor(),
                blockData: {
                    value: blockData,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                blockHeaderCbor: {
                    value: blockData,
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
            blockData: Cbor.encode( this.blockData ).toString(),
            tip: this.tip.toJson()
        };
    }

    toString(): string
    {
        return `(roll forward: (header: ${Cbor.encode(this.blockData).toString()}) ${this.tip.toString()} )`
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(2),
            this.blockData,
            this.tip.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncRollForward
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();

        const msg = ChainSyncRollForward.fromCborObj( Cbor.parse( buff ) );

        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
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
            blockData: headerCbor,
            tip: ChainTip.fromCborObj( tipCbor )
        });
    }
}