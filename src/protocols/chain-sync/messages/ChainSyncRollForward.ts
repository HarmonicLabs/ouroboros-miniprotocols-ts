import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, LazyCborArray, SubCborRef, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { ChainTip, IChainTip, isIChainTip } from "../../types/ChainTip";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";
import { toHex } from "@harmoniclabs/uint8array-utils";

export interface IChainSyncRollForward {
    data: CborObj
    tip: IChainTip
}

export class ChainSyncRollForward
    implements ToCbor, ToCborObj, IChainSyncRollForward
{
    readonly data: CborObj;
    readonly tip: ChainTip;

    constructor(
        forward: IChainSyncRollForward,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { data, tip } = forward;
        if(!(
            isCborObj( data ) &&
            isIChainTip( tip )
        )) throw new Error("invalid IChainSyncRollForward interface");

        this.data = data;
        this.tip = tip instanceof ChainTip ? tip : new ChainTip( tip );
        this.cborRef = cborRef ?? subCborRefOrUndef( forward );
    };

    toJSON() { return this.toJson(); }
    toJson()
    {
        return {
            data: toHex( this.toCborBytes() ),
            tip: this.tip.toJson()
        };
    }
    toString(): string
    {
        return `(roll forward: (header: ${Cbor.encode(this.data).toString()}) ${this.tip.toString()} )`
    }

    toCborBytes(): Uint8Array
    {
        if( this.cborRef instanceof SubCborRef ) return this.cborRef.toBuffer();
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        if( this.cborRef instanceof SubCborRef ) return new CborString( this.cborRef.toBuffer() );
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        if( this.cborRef instanceof SubCborRef ) return Cbor.parse( this.cborRef.toBuffer() ) as CborArray;
        return new CborArray([
            new CborUInt(2),
            this.data,
            this.tip.toCborObj()
        ]);
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

        return ChainSyncRollForward.fromCborObj( Cbor.parse( buff ), buff );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): ChainSyncRollForward
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
        }, getSubCborRef( cbor, originalBytes ));
    }
}