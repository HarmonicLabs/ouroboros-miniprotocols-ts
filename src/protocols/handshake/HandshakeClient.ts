import { Multiplexer } from "../../multiplexer";
import { isVersionTableMap, normalizeVersionTableMap, VersionTableMap } from "./HandshakeVersionTable/HandshakeVersionTable";
import { IVersionData, VersionData } from "./HandshakeVersionTable/VersionData";
import { VersionNumber } from "./HandshakeVersionTable/VersionNumber";
import { HandshakeAcceptVersion } from "./messages/HandshakeAcceptVersion";
import { HandshakeMessage } from "./messages/HandshakeMessage";
import { HandshakeProposeVersion } from "./messages/HandshakeProposeVersion";
import { HandshakeQueryReply } from "./messages/HandshakeQueryReply";
import { HandshakeRefuse } from "./messages/HandshakeRefuse";


type HandshakeClientEvtName     = keyof Omit<HandshakeClientEvtListeners, "error">;
type AnyHandshakeClientEvtName  = HandshakeClientEvtName | "error";

type HandshakeClientEvtListeners = {
    propose     : HandshakeClientEvtListener[],
    accept      : HandshakeClientEvtListener[],
    refuse      : HandshakeClientEvtListener[],
    queryReply  : HandshakeClientEvtListener[],
    error       : (( err: Error ) => void)[]
};

type HandshakeClientEvtListener     = ( msg: HandshakeMessage ) => void;
type AnyHandshakeClientEvtListener  = HandshakeClientEvtListener | (( err: Error ) => void);

type MsgOf<EvtName extends AnyHandshakeClientEvtName> =
    EvtName extends "propose"       ? HandshakeProposeVersion   : 
    EvtName extends "accept"        ? HandshakeAcceptVersion    :
    EvtName extends "refuse"        ? HandshakeRefuse           :
    EvtName extends "queryReply"    ? HandshakeQueryReply       :
    EvtName extends "error"         ? Error                     :
    never;

function msgToName( msg: HandshakeMessage ): HandshakeClientEvtName | undefined
{
    if( msg instanceof HandshakeProposeVersion )        return "propose";
    if( msg instanceof HandshakeAcceptVersion )         return "accept";
    if( msg instanceof HandshakeRefuse )                return "refuse";
    if( msg instanceof HandshakeQueryReply )            return "queryReply";
    
    return undefined;
}

function isAnyHandshakeClientEvtName( str: any ): str is AnyHandshakeClientEvtName
{
    return isHandshakeClientEvtName( str ) || str === "error";
}
function isHandshakeClientEvtName( str: any ): str is HandshakeClientEvtName
{
    return (
        str === "propose"       ||
        str === "accept"        ||
        str === "refuse"        ||
        str === "queryReply"
    );
}

type EvtListenerOf<EvtName extends AnyHandshakeClientEvtName> =
    EvtName extends "propose"       ? ( msg: HandshakeProposeVersion )  => void :
    EvtName extends "accept"        ? ( msg: HandshakeAcceptVersion )   => void :
    EvtName extends "refuse"        ? ( msg: HandshakeRefuse )          => void :
    EvtName extends "queryReply"    ? ( msg: HandshakeQueryReply )      => void :
    EvtName extends "error"         ? ( err: Error )                    => void :
    never;


export class HandshakeClient
{
    readonly mplexer: Multiplexer;

    private readonly _listeners: HandshakeClientEvtListeners = Object.freeze({
        propose     : [],
        accept      : [],
        refuse      : [],
        queryReply  : [],
        error       : []
    });

    private readonly _onceListeners: HandshakeClientEvtListeners = Object.freeze({
        propose     : [],
        accept      : [],
        refuse      : [],
        queryReply  : [],
        error       : []
    });

    constructor(
        mplexer: Multiplexer
    )
    {
        this.mplexer = mplexer;
    }

    propose(
        /** @default versionTable defaults to all the known versions (depending by n2n or n2c) */
        arg?: VersionTableMap | IVersionData | VersionData
    ): Promise<HandshakeAcceptVersion | HandshakeRefuse | HandshakeQueryReply>
    {
        const self = this;
        const isN2N = self.mplexer.isN2N;
        const versionTable = normalizeProposeArg( arg, isN2N );

        return new Promise( async (resolve) => {
            
        });
    } 
}

function normalizeProposeArg(
    arg: VersionTableMap | IVersionData | undefined,
    isN2N: boolean
): VersionTableMap
{
    if( isVersionTableMap( arg ) ) return normalizeVersionTableMap( arg );

    const allVersions: VersionNumber[] = isN2N ? [
        7, 8, 9, 10, 11, 12, 13, 14
    ] : [
        16, 17, 18, 19
    ];

    const versionData = arg === undefined ? VersionData.mainnet() : (
        arg instanceof VersionData ? arg.clone() :
            new VersionData( arg, {
                includePeerSharing: isN2N,
                includeQuery: true,
            })
    );

    const result: VersionTableMap = {};

    for( const version of allVersions )
    {
        result[ version ] = versionData.clone();
    }

    return normalizeVersionTableMap( result );
}