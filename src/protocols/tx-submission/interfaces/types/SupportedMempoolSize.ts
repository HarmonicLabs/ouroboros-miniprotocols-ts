export enum MempoolSize {
    kb32 = 32768,
    kb64 = 65536,
    kb128 = 131072,
    kb256 = 262144
}

Object.freeze( MempoolSize );

export type SupportedMempoolSize
    = 32768     // 32KB
    | 65536     // 64KB
    | 131072    // 128KB
    | 262144    // 256KB


export function isSupportedMempoolSize(value: any): value is SupportedMempoolSize
{
    return (
        value === 32768     ||
        value === 65536     ||
        value === 131072    ||
        value === 262144
    );
}

export function getMaxTxAllowed( size: SupportedMempoolSize ): number
{
    // only odd max txs
    // to always allign memory as multiple of 8 ( 64 bit reads )
    // the first index is awlays omitted ( implicit )
    // so odd max txs => even n of indexes
    switch( size )
    {
        case 32768: return 63;
        case 65536: return 127;

        case 131072:
        case 262144: return 255; 
        default: throw new Error(`Invalid SupportedMempoolSize: ${size}`);
    }
}
