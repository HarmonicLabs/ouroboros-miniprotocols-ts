import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, LazyCborArray, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { LazyCborTag } from "@harmoniclabs/cbor/dist/LazyCborObj/LazyCborTag";
import { hasOwn, isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

export interface IBlockFetchBlock {
    blockData: CanBeCborString
}

export function isIBlockFetchBlock( stuff: any ): stuff is IBlockFetchBlock
{
    return isObject( stuff ) && (
        hasOwn( stuff, "blockData" ) &&
        (
            CborString.isValidHexValue( stuff.blockData ) ||
            stuff.blockData instanceof Uint8Array ||
            stuff.blockData instanceof CborString
        )
    );
}

export class BlockFetchBlock
    implements ToCbor, ToCborObj, IBlockFetchBlock
{
    readonly blockData: Uint8Array;

    constructor(
        blk: IBlockFetchBlock,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        if(!(
            isIBlockFetchBlock( blk )
        )) throw new Error("invalid interface for 'BlockFetchBlock'");

        this.blockData = blk.blockData instanceof Uint8Array ? blk.blockData : forceCborString( blk.blockData ).toBuffer();
        this.cborRef = cborRef ?? subCborRefOrUndef( blk );
    };

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
            new CborUInt(4),
            new CborTag(
                24,
                new CborBytes( this.blockData )
            )
        ]);
    }

    /**
     * @returns {Uint8Array}
     * the bytes of `this.blockData` as present on `this.cborBytes`
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
        
        return taggedElem.bytes;
    }
    
    static fromCbor( cbor: CanBeCborString ): BlockFetchBlock
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();

        return BlockFetchBlock.fromCborObj(
            Cbor.parse( buff, { keepRef: true } ),
            buff
        );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): BlockFetchBlock
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
            blockData: arg.bytes
        }, getSubCborRef( cbor, originalBytes ));
    }
}