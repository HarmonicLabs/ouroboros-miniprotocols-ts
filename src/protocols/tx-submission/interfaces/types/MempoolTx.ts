import { toHex } from "@harmoniclabs/uint8array-utils";
import { mempoolTxHashToString, U8Arr32 } from "./MempoolTxHash";

export interface MempoolTx {
    hash: U8Arr32;
    bytes: Uint8Array;
}

export function mempoolTxToJson( memTx: MempoolTx )
{
    return {
        hash: mempoolTxHashToString( memTx.hash ),
        bytes: toHex( memTx.bytes )
    };
}
