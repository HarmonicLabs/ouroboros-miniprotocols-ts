import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { hasOwn, isObject } from "@harmoniclabs/obj-utils";

export interface IBlockFetchBlock {
    blockCbor: CanBeCborString
}

export function isIBlockFetchBlock( stuff: any ): stuff is IBlockFetchBlock
{
    return isObject( stuff ) && (
        hasOwn( stuff, "blockCbor" ) &&
        (
            CborString.isValidHexValue( stuff.blockCbor ) ||
            stuff.blockCbor( stuff.blockCbor instanceof Uint8Array) ||
            stuff.blockCbor instanceof CborString
        )
    );
}

export class BlockFetchBlock
    implements ToCbor, ToCborObj, IBlockFetchBlock
{
    readonly blockCbor: CborString;

    constructor({ blockCbor }: IBlockFetchBlock)
    {
        if(!(
            isIBlockFetchBlock( blockCbor )
        )) throw new Error("invalid CBOR for 'BlockFetchBlock'");

        Object.defineProperty(
            this, "blockCbor", {
                value: forceCborString( blockCbor ),
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
    };

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt(4),
            new CborTag(
                24,
                new CborBytes(
                    this.blockCbor.toBuffer()
                )
            )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): BlockFetchBlock
    {
        return BlockFetchBlock.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): BlockFetchBlock
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(4) &&
            cbor.array[1] instanceof CborTag &&
            cbor.array[1].tag === BigInt(24) &&
            cbor.array[1].data instanceof CborBytes
        )) throw new Error("invalid CBOR for 'BlockFetchBlock");

        return new BlockFetchBlock({
            blockCbor: cbor.array[1].data.buffer
        });
    }
}