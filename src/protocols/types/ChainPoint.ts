import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { canBeUInteger } from "./ints";
import { toHex } from "@harmoniclabs/uint8array-utils";

export interface IBlockHeaderHash {
    readonly slotNumber: number | bigint,
    readonly hash: Uint8Array
}

export function isIBlockHeaderHash( stuff: any ): stuff is IBlockHeaderHash
{
    return (
        isObject( stuff ) &&
        canBeUInteger( stuff.slotNumber ) &&
        ( stuff.hash instanceof Uint8Array )
    );
}

export interface IChainPoint {
    blockHeader?: IBlockHeaderHash
}

export function isIChainPoint( stuff: any ): stuff is IChainPoint
{
    return (
        isObject( stuff ) &&
        (
            typeof stuff.blockHeader === "undefined" ||
            isIBlockHeaderHash( stuff.blockHeader )
        )
    );
}

export function isOriginPoint( point: IChainPoint ): boolean
{
    return typeof point.blockHeader === "undefined" || !isIBlockHeaderHash( point.blockHeader );
}

export class ChainPoint
    implements ToCbor, ToCborObj, IChainPoint
{
    readonly blockHeader?: IBlockHeaderHash;

    isOrigin(): boolean { return isOriginPoint( this ) }

    constructor( chainPoint: IChainPoint )
    {
        if( !isIChainPoint( chainPoint ) )
        throw new Error("invalid IChainPoint interface");

        Object.defineProperty(
            this, "blockHeader", {
                value: chainPoint.blockHeader ? { ...chainPoint.blockHeader } : undefined,
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
    }

    toJson()
    {
        if( this.isOrigin() ) return {};
        return {
            blockHeader: {
                hash: toHex( this.blockHeader!.hash ),
                slot: Number( this.blockHeader!.slotNumber )
            }
        };
    }

    toString(): string
    {
        if( this.isOrigin() ) return "(point: origin)";

        return `(point: ( hash: ${toHex( this.blockHeader!.hash )}, slot: ${this.blockHeader!.slotNumber} ))`
    }

    toCbor()
    {
        return Cbor.encode( this.toCborObj() )
    }
    toCborObj(): CborArray
    {
        if( this.isOrigin() || this.blockHeader === undefined ) return new CborArray([]);

        return new CborArray([
            new CborUInt( this.blockHeader.slotNumber ),
            new CborBytes( this.blockHeader.hash )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainPoint
    {
        return ChainPoint.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): ChainPoint
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'ChainPoint'");

        if( cbor.array.length === 0 ) return new ChainPoint({}); // origin

        const [ slot, hash ] = cbor.array;

        if(!(
            slot instanceof CborUInt &&
            hash instanceof CborBytes
        )) throw new Error("invalid CBOR for 'ChainPoint'");

        return new ChainPoint({
            blockHeader: {
                slotNumber: slot.num,
                hash: hash.buffer
            }
        });
    }
}