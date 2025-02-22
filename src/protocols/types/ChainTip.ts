import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { ChainPoint, IChainPoint, isIChainPoint } from "./ChainPoint";
import { isObject } from "@harmoniclabs/obj-utils";
import { canBeUInteger, forceBigUInt } from "./ints";

export interface IChainTip {
    point: IChainPoint,
    blockNo: number | bigint 
}

export function isIChainTip( stuff: any ): stuff is IChainTip
{
    return (
        isObject( stuff ) &&
        isIChainPoint( stuff.point ) &&
        canBeUInteger( stuff.blockNo )
    )
}

export class ChainTip
    implements ToCborString, ToCborObj, IChainTip
{
    readonly point: ChainPoint;
    readonly blockNo: bigint;

    constructor({ point, blockNo }: IChainTip)
    {
        if(!(
            isIChainPoint( point ) &&
            canBeUInteger( blockNo )
        )) throw new Error("invalid IChainTip interface");

        Object.defineProperties(
            this, {
                point: {
                    value: new ChainPoint( point ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                blockNo: {
                    value: forceBigUInt( blockNo ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    toJSON() { return this.toJson(); }
    toJson()
    {
        return {
            point: this.point.toJson(),
            blockNo: Number( this.blockNo )
        };
    }

    toString(): string
    {
        return `(tip: ${this.point.toString()} (${this.blockNo}))`;
    }

    toCbor()
    {
        return Cbor.encode( this.toCborObj() )
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            this.point.toCborObj(),
            new CborUInt( this.blockNo )
        ]);
    }
    
    static fromCbor( cbor: CanBeCborString ): ChainTip
    {
        return ChainTip.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): ChainTip
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'ChainTip'");

        const [ _point, _blockNo ] = cbor.array;

        if(!(
            _blockNo instanceof CborUInt
        )) throw new Error("invalid CBOR for 'ChainTip'");

        return new ChainTip({
            point: ChainPoint.fromCborObj( _point ),
            blockNo: _blockNo.num
        });
    }

    static eq( a: IChainTip, b: IChainTip ): boolean
    {
        return (
            ChainPoint.eq( a.point, b.point ) &&
            a.blockNo === b.blockNo
        );
    }
}