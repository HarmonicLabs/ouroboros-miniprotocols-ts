import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, LazyCborArray, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { LazyCborTag } from "@harmoniclabs/cbor/dist/LazyCborObj/LazyCborTag";
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
            stuff.blockCbor instanceof Uint8Array ||
            stuff.blockCbor instanceof CborString
        )
    );
}

export class BlockFetchBlock
    implements ToCbor, ToCborObj, IBlockFetchBlock
{
    readonly cborBytes?: Uint8Array
    readonly blockCbor: CborString;

    constructor( iblock: IBlockFetchBlock)
    {
        if(!(
            isIBlockFetchBlock( iblock )
        )) throw new Error("invalid interface for 'BlockFetchBlock'");

        Object.defineProperty(
            this, "blockCbor", {
                value: forceCborString( iblock.blockCbor ),
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
    };

    toCbor(): CborString
    {
        return new CborString( this.toCborBytes() );
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
     * the bytes of `this.blockCbor` as present on `this.cborBytes`
     * (using `Cbor.parseLazy`)
     */
    getBlockBytes(): Uint8Array
    {
        const msgData = this.toCborBytes();
        const lazy = Cbor.parseLazy( msgData );
        if(!( lazy instanceof LazyCborArray )) throw new Error("invalid 'BlockFetchBlock' cbor found");
        
        const tagBytes = lazy.array[1];
        const lazyTag = Cbor.parseLazy( tagBytes );
        if(!( lazyTag instanceof LazyCborTag )) throw new Error("invalid 'BlockFetchBlock' cbor found");
        
        const taggedElem = lazyTag.data;
        if(!( taggedElem instanceof CborBytes )) throw new Error("invalid 'BlockFetchBlock' cbor found");
        
        return taggedElem.buffer;
    }
    
    static fromCbor( cbor: CanBeCborString ): BlockFetchBlock
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();

        const msg = BlockFetchBlock.fromCborObj( Cbor.parse( buff ) );

        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
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