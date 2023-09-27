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
            // is array
            cbor instanceof CborArray &&
            // with at least two elements
            cbor.array.length >= 2 &&
            // of which the first is the `BlockFetchBlock` index
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(4)
        )) throw new Error("invalid CBOR for 'BlockFetchBlock");

        let arg = cbor.array[1];

        if(
            arg instanceof CborTag &&
            arg.tag === BigInt(24) &&
            arg.data instanceof CborBytes
        )
        {
            arg = arg.data
        }

        if( !( arg instanceof CborBytes ) )
        throw new Error("invalid CBOR for 'BlockFetchBlock");

        return new BlockFetchBlock({
            blockCbor: arg.buffer
        });
    }
}