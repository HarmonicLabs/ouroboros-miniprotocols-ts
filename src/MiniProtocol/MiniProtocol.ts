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
    KeepAlive = 8,
    LocalTxMonitor = 9
}

Object.freeze( MiniProtocol );

export type MiniProtocolStr
    = "Handshake"
    | "ChainSync"
    | "LocalChainSync"
    | "BlockFetch"
    | "TxSubmission"
    | "LocalTxSubmission"
    | "LocalStateQuery"
    | "KeepAlive"
    | "LocalTxMonitor";

export function isMiniProtocolStr( thing: any ): thing is MiniProtocolStr
{
    return (
        thing === "Handshake"           ||
        thing === "ChainSync"           ||
        thing === "LocalChainSync"      ||
        thing === "BlockFetch"          ||
        thing === "TxSubmission"        ||
        thing === "LocalTxSubmission"   ||
        thing === "LocalStateQuery"     ||
        thing === "KeepAlive"           ||
        thing === "LocalTxMonitor"
    );
}

export type MiniProtocolNum
    = 0 // "Handshake"
    | 2 // "ChainSync"
    | 5 // "LocalChainSync"
    | 3 // "BlockFetch"
    | 4 // "TxSubmission"
    | 6 // "LocalTxSubmission"
    | 7 // "LocalStateQuery"
    | 8 // "KeepAlive"
    | 9 // "LocalTxMonitor";

export function isMiniProtocolNum( thing: any ): thing is MiniProtocolNum
{
    return (
        thing === 0 || // "Handshake"
        thing === 2 || // "ChainSync"
        thing === 5 || // "LocalChainSync"
        thing === 3 || // "BlockFetch"
        thing === 4 || // "TxSubmission"
        thing === 6 || // "LocalTxSubmission"
        thing === 7 || // "LocalStateQuery"
        thing === 8 || // "KeepAlive";
        thing === 9    // "LocalTxMonitor";
    );
}

export function miniProtocolToNumber( protocol: number | string ): MiniProtocolNum
{
    return typeof protocol === "string" ? MiniProtocol[protocol as any] as any as MiniProtocolNum : Number( protocol ) as MiniProtocolNum;
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
            protocol === MiniProtocol.TxSubmission      ||
            protocol === MiniProtocol.LocalTxMonitor
        );
    }
    else if( typeof protocol === "string" )
    {
        return isMiniProtocol( miniProtocolToNumber( protocol ) )
    }
    return false;
}