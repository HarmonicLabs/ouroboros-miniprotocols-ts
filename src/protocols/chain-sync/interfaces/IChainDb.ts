import { IChainPoint, IChainTip, RealPoint } from "../../types";
export interface IChainDb 
{
    /**
     * @returns {IChainTip} not really the tip of the chain but we need the block number
     */
    findIntersect( ...point: IChainPoint[] ): Promise<IChainTip | undefined>;
    getBlockNo( blockIndex: bigint ): Promise<Uint8Array>;
    getTip(): Promise<IChainTip>;
    on(  evtName: "extend" | "fork", cb : ( tip: IExtendData ) => any ): void;
    off( evtName: "extend" | "fork", cb?: ( tip: IExtendData ) => any ): void;
}

export interface IExtendData
{
    tip: IChainTip;
    intersection: IChainPoint;
}