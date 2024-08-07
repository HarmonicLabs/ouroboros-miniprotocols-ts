import { isObject } from "@harmoniclabs/obj-utils";
import { BlockFetchBatchDone, IBlockFetchBatchDone } from "./messages/BlockFetchBatchDone";
import { BlockFetchBlock, IBlockFetchBlock } from "./messages/BlockFetchBlock";
import { BlockFetchClientDone, IBlockFetchClientDone } from "./messages/BlockFetchClientDone";
import { BlockFetchNoBlocks, IBlockFetchNoBlocks } from "./messages/BlockFetchNoBlocks";
import { BlockFetchRequestRange, IBlockFetchRequestRange } from "./messages/BlockFetchRequestRange";
import { BlockFetchStartBatch, IBlockFetchStartBatch } from "./messages/BlockFetchStartBatch";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, forceCborString } from "@harmoniclabs/cbor";

export type BlockFetchMessage
    = BlockFetchRequestRange
    | BlockFetchClientDone
    | BlockFetchStartBatch
    | BlockFetchNoBlocks
    | BlockFetchBlock
    | BlockFetchBatchDone;

export function isBlockFetchMessage( stuff: any ): stuff is BlockFetchMessage
{
    return isObject( stuff ) && (
        stuff instanceof BlockFetchRequestRange ||
        stuff instanceof BlockFetchClientDone   ||
        stuff instanceof BlockFetchStartBatch   ||
        stuff instanceof BlockFetchNoBlocks     ||
        stuff instanceof BlockFetchBlock        ||
        stuff instanceof BlockFetchBatchDone
    );
}

export type IBlockFetchMessage
    = IBlockFetchRequestRange
    | IBlockFetchClientDone
    | IBlockFetchStartBatch
    | IBlockFetchNoBlocks
    | IBlockFetchBlock
    | IBlockFetchBatchDone;

export function blockFetchMessageFromCbor( cbor: CanBeCborString ): BlockFetchMessage
{
    return blockFetchMessageFromCborObj(
        Cbor.parse( 
            cbor instanceof Uint8Array ? 
                cbor :
                forceCborString( cbor )
        )
    );
}

export function blockFetchMessageFromCborObj( cbor: CborObj ): BlockFetchMessage
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid cbor for 'BlockFetchMessage'");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return BlockFetchRequestRange.fromCborObj( cbor );
    if( idx === 1 ) return new BlockFetchClientDone();
    if( idx === 2 ) return new BlockFetchStartBatch();
    if( idx === 3 ) return new BlockFetchNoBlocks();
    if( idx === 4 ) return BlockFetchBlock.fromCborObj( cbor );
    if( idx === 5 ) return new BlockFetchBatchDone();

    throw new Error("invalid cbor for 'BlockFetchMessage'; unknown index: " + idx);
}