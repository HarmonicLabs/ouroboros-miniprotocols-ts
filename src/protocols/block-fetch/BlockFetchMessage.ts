import { isObject } from "@harmoniclabs/obj-utils";
import { BlockFetchBatchDone, IBlockFetchBatchDone } from "./BlockFetchBatchDone";
import { BlockFetchBlock, IBlockFetchBlock } from "./BlockFetchBlock";
import { BlockFetchClientDone, IBlockFetchClientDone } from "./BlockFetchClientDone";
import { BlockFetchNoBlocks, IBlockFetchNoBlocks } from "./BlockFetchNoBlocks";
import { BlockFetchRequestRange, IBlockFetchRequestRange } from "./BlockFetchRequestRange";
import { BlockFetchStartBatch, IBlockFetchStartBatch } from "./BlockFetchStartBatch";

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