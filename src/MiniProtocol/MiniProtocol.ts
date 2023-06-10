export enum MiniProtocol {
    Handshake = 0,
    /** Node-to-Node ChainSync */
    ChainSync = 2,
    /** Node-to-Client ChainSync */
    LocalChainSync = 5,
    BlockFetch = 3,
    /** Node-to-Node TxSubmission */
    TxSubmission = 4,
    /** Node-to-Client TxSubmission */
    LocalTxSubmission = 6,
    LocalStateQuery = 7,
    KeepAlive = 8
}

Object.freeze( MiniProtocol );

export function miniProtocolToNumber( protocol: MiniProtocol ): number
{
    return typeof protocol === "string" ? MiniProtocol[protocol] as any as number : Number( protocol );
}

export function miniProtocolToString( protocol: MiniProtocol ): string
{
    return typeof protocol === "number" ? MiniProtocol[protocol] : String( protocol );
}
