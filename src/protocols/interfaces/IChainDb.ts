import { IChainPoint, IChainTip } from "../types";
export interface IChainDb 
{
    /**
     * @returns {IChainTip} not really the tip of the chain but we need the block number
     */
    findIntersect( ...point: IChainPoint[] ): Promise<IChainTip | undefined>;
    getBlockNo( blockIndex: bigint ): Promise<Uint8Array>;
    getTip(): Promise<IChainTip>;

    /**
     * @returns {ChainPoint[]} if blocks are present between the range
     */
    getBlocksBetweenRange( from: IChainPoint, to: IChainPoint ): Promise<IChainPoint[]>;

    on(  evtName: "extend" | "fork", cb : ( tip: IExtendData ) => any ): void;
    off( evtName: "extend" | "fork", cb?: ( tip: IExtendData ) => any ): void;
}

export interface IExtendData
{
    tip: IChainTip;
    intersection: IChainTip;
}
