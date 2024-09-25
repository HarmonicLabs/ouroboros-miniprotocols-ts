export enum MempoolAppendStatus {
    Ok = 0,
    AlreadyPresent = 1,
    InsufficientSpace = 2,
    MaxTxsReached = 3,
}

Object.freeze( MempoolAppendStatus );

export interface MempoolAppendResult {
    status: MempoolAppendStatus;
    nTxs: number;
    aviableSpace: number;
}

export function mempoolAppendResultToJson( res: MempoolAppendResult )
{
    return {
        staus: MempoolAppendStatus[ res.status ],
        nTxs: res.nTxs,
        aviableSpace: res.aviableSpace,
    };
}
