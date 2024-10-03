import { IChainPoint, IChainTip, RealPoint } from "../../types";
import { LookupBlockInfosFn } from "./IBlockInfos";

export interface IChainDb 
{
    readonly volatileDb: IVolatileDb;
    readonly immutableDb: IImmutableDb;
}

/**
 * to iterate volatile database
 */
export interface IVolatileDb 
{
    // main chain
    readonly main: RealPoint[];

    // main chain forks
    readonly forks: IChainFork[];

    // last block of the volataile database on the main chain
    readonly tip: IChainTip;

    // first block of the volataile database
    readonly anchor: RealPoint;

    hashToBlockData: LookupBlockInfosFn;

    findIntersect( from: IChainPoint, to: IChainPoint ): Promise<IChainPoint | undefined>;
}

export interface IChainFork 
{
    /** point in the main chain */
    readonly intersection: RealPoint;

    /** continuation from intersection */
    readonly fragment: RealPoint[];
}

/**
 * should be only used to understand if a point is immutable
 * 
 * CANNOT FORK HERE
*/ 
export interface IImmutableDb 
{
    readonly path: string;
    readonly chainDb: IChainDb;
    readonly chunks: number;
}
