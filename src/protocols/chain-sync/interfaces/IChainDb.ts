import { IChainPoint } from "../../types";

export interface IChainDb {
    volatile: IVolatileDb;
    immutable: IImmutableDb;
}

/**
 * 
 */
export interface IVolatileDb {

    findIntersect( a: IChainPoint, b: IChainPoint ): Promise<IChainPoint | undefined>;
}

/**
 * should be only used to understand if a point is immutable
 * 
 * CANNOT FORK HERE
*/ 
export interface IImmutableDb {

}