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

export function miniProtocolToNumber( protocol: number | string ): number
{
    return typeof protocol === "string" ? MiniProtocol[protocol as any] as any as number : Number( protocol );
}

export function miniProtocolToString( protocol: number | string ): string
{
    return typeof protocol === "number" ? MiniProtocol[protocol] : String( protocol );
}

export function isMiniProtocol( protocol: number | string ): boolean
{
    if( typeof protocol === "number" )
    {
        return (
            protocol === MiniProtocol.BlockFetch        ||
            protocol === MiniProtocol.ChainSync         ||
            protocol === MiniProtocol.Handshake         ||
            protocol === MiniProtocol.KeepAlive         ||
            protocol === MiniProtocol.LocalChainSync    ||
            protocol === MiniProtocol.LocalStateQuery   ||
            protocol === MiniProtocol.LocalTxSubmission ||
            protocol === MiniProtocol.TxSubmission
        );
    }
    else if( typeof protocol === "string" )
    {
        return isMiniProtocol( miniProtocolToNumber( protocol ) )
    }
    return false;
}