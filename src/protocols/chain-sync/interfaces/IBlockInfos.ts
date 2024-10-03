export interface IBlockInfos 
{
    readonly hash: Uint8Array,
    readonly slotNo: number,
    readonly blockNo: number,
    readonly prevHash: Uint8Array
}

export type LookupBlockInfosFn = ( hash: Uint8Array ) => ( IBlockInfos );
