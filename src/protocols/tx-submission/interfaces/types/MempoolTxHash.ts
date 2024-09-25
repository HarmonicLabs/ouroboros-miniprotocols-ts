import { fromHex, toHex } from "@harmoniclabs/uint8array-utils";

export type U8Arr<Len extends number> = Uint8Array & { readonly length: Len };

export type U8Arr32 = U8Arr<32>;

export type MempoolTxHashBI = BigUint64Array & { length: 4 }; // 32 bytes
export type MempoolTxHash = Int32Array & { length: 8 }; // 32 bytes

export type MempoolTxHashLike = Uint8Array | Int32Array | BigUint64Array;

export function mempoolTxHashToString( hash: MempoolTxHashLike ): string
{
    return toHex( forceMempoolTxHashU8( hash ) ); 
}

export function mempoolTxHashFromString( hash: string ): MempoolTxHash
{
    const u8 = fromHex( hash );
    return new Int32Array( u8.buffer ) as MempoolTxHash;
}

export function isMempoolTxHashLike( hashLike: any ): hashLike is MempoolTxHashLike
{
    return (
        (
            hashLike instanceof Uint8Array &&
            hashLike.length === 32
        ) ||
        (
            hashLike instanceof Int32Array &&
            hashLike.length === 8
        ) ||
        (
            hashLike instanceof BigUint64Array &&
            hashLike.length === 4
        )
    );
}

export function forceMempoolTxHash( hashLike: MempoolTxHashLike ): MempoolTxHash
{
    return new Int32Array( hashLike.buffer, 0, 8 ) as MempoolTxHash;
}

export function forceMempoolTxHashU8( hashLike: MempoolTxHashLike ): U8Arr32
{
    const buff = new ArrayBuffer( 32 );
    const u8 = new Uint8Array( buff );
    const i32 = new Int32Array( buff );
    i32.set( forceMempoolTxHash( hashLike ) );
    return u8 as U8Arr32;
}

export function isMempoolTxHash( hash : any ): hash is MempoolTxHash
{
    return hash instanceof Int32Array && hash.length === 8;
}

export function eqMempoolTxHash(a: MempoolTxHash, b: MempoolTxHash): boolean
{
    return (
        a[0] === b[0] &&
        a[1] === b[1] &&
        a[2] === b[2] &&
        a[3] === b[3] &&
        a[4] === b[4] &&
        a[5] === b[5] &&
        a[6] === b[6] &&
        a[7] === b[7]
    );
}
