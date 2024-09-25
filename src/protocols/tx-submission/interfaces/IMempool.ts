import { MempoolTxHash, MempoolTxHashLike, MempoolTx, MempoolAppendResult, SupportedMempoolSize } from "./types";

export interface SharedMempoolArgs {}

export const defaultConfig: SharedMempoolArgs = {}

export interface SharedMempoolConfig extends SharedMempoolArgs
{
    readonly size: SupportedMempoolSize,
    readonly maxTxs: number,
    readonly allHashesSize: number
    readonly startHashesU8: number,
    readonly startTxsU8: number,
}


export interface TxHashAndSize
{
    hash: MempoolTxHash;
    size: number;
}

export interface IMempool 
{
    readonly config: SharedMempoolConfig;
    getTxCount(): Promise<number>;
    getAviableSpace(): Promise<number>;
    getTxHashes(): Promise<MempoolTxHash[]>;
    getTxHashesAndSizes(): Promise<TxHashAndSize[]>;
    getTxs( hashes: MempoolTxHashLike[] ): Promise<MempoolTx[]>;
    append( hash: MempoolTxHashLike, tx: Uint8Array ): Promise<MempoolAppendResult>;
    drop( hashes: MempoolTxHashLike[] ): Promise<void>;
}
