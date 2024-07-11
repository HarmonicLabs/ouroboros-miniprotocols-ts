import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, LazyCborArray, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { ChainTip, IChainTip, isIChainTip } from "../../types/ChainTip";
import { getCborBytesDescriptor } from "../../utils/getCborBytesDescriptor";

export interface IChainSyncRollForward {
    data: CborObj
    /** @deprecated */
    blockData?: CborObj
    /** @deprecated */
    blockHeaderCbor?: CborObj,
    tip: IChainTip
}

export class ChainSyncRollForward
    implements ToCbor, ToCborObj, IChainSyncRollForward
{
    readonly cborBytes?: Uint8Array | undefined;

    /** @deprecated use `data` instead */
    readonly blockData: CborObj;
    /** @deprecated use `data` instead */
    readonly blockHeaderCbor: CborObj;

    readonly data: CborObj;
    readonly tip: ChainTip;

    constructor({ data, blockData, tip }: IChainSyncRollForward)
    {
        data = data ?? blockData;
        if(!(
            isCborObj( data ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncRollForward interface");

        Object.defineProperties(
            this, {
                cborBytes: getCborBytesDescriptor(),
                data: {
                    value: data,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                // deprecated
                blockData: {
                    value: data,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                // deprecated
                blockHeaderCbor: {
                    value: data,
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
            data: Cbor.encode( this.data ).toString(),
            tip: this.tip.toJson()
        };
    }

    toString(): string
    {
        return `(roll forward: (header: ${Cbor.encode(this.data).toString()}) ${this.tip.toString()} )`
    }

    toCbor(): CborString
    {
        return new CborString( this.toCborBytes() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt(2),
            this.data,
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

    /**
     * @returns {Uint8Array}
     * the bytes of `this.data` as present on `this.cborBytes`
     * (using `Cbor.parseLazy`)
     */
    getDataBytes(): Uint8Array
    {
        const msgData = this.toCborBytes();
        const lazy = Cbor.parseLazy( msgData ) as LazyCborArray;
        return lazy.array[1];
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
            data: headerCbor,
            tip: ChainTip.fromCborObj( tipCbor )
        });
    }
}