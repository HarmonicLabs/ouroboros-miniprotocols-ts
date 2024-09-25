import { MempoolTxHash } from "./MempoolTxHash";

export type IndexedHash = [ hash: MempoolTxHash, idx: number ];

export function findSortedIndex( hashes: IndexedHash[], index: number ): number
{
    let low = 0;
    let high = hashes.length;

    while( low < high )
    {
        const mid = (low + high) >>> 1;
        if( hashes[mid][1] < index ) low = mid + 1;
        else high = mid;
    }
    return low;
}

export function insertSortedHash( hashes: IndexedHash[], indexedHash: IndexedHash ): void
{
    void hashes.splice( findSortedIndex( hashes, indexedHash[1] ), 0, indexedHash );
}
