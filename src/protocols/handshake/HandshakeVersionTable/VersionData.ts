import { isObject } from "@harmoniclabs/obj-utils";
import { CardanoNetworkMagic, isNetworkMagic, NetworkMagic } from "./NetworkMagic"
import { OptField } from "../../types/OptField";
import { CborObj, CborMap, CborUInt, CborArray, CborSimple, CanBeCborString, forceCborString, Cbor, CborString } from "@harmoniclabs/cbor";
import { Definitely } from "../../types/Definitely";
import { bool, isMaybeBool } from "../../utils/bool";

export interface IVersionData {
    networkMagic: number,
    initiatorOnlyDiffusionMode?: boolean,
    peerSharing?: boolean,
    query?: boolean,
}

export function isIVersionData( stuff: any ): stuff is IVersionData
{
    return (
        isObject( stuff ) &&
        isNetworkMagic( stuff.networkMagic ) &&
        isMaybeBool( stuff.initiatorOnlyDiffusionMode ) &&
        isMaybeBool( stuff.peerSharing ) &&
        isMaybeBool( stuff.query )
    );
}

export interface VersionDataOptions {
    includePeerSharing?: boolean,
    includeQuery?: boolean,
}

const defaultVersionDataOptions: Definitely<VersionDataOptions> = Object.freeze({
    includePeerSharing: true,
    includeQuery: true,
});

export class VersionData
    implements Definitely<IVersionData>, Definitely<VersionDataOptions>
{
    readonly networkMagic: NetworkMagic
    readonly initiatorOnlyDiffusionMode: boolean
    readonly peerSharing: boolean
    readonly query: boolean

    readonly includePeerSharing: boolean
    readonly includeQuery: boolean

    // cddl:
    // nodeToNodeVersionData = [ networkMagic, initiatorOnlyDiffusionMode, peerSharing, query ]
    // nodeToNodeVersionData = [ networkMagic, initiatorOnlyDiffusionMode, peerSharing, query ]
    // nodeToNodeVersionData = [ networkMagic, initiatorOnlyDiffusionMode ]
    // nodeToClientVersionData = [networkMagic, query]
    constructor({
        networkMagic,
        initiatorOnlyDiffusionMode,
        peerSharing,
        query
    }: IVersionData,
    {
        includePeerSharing,
        includeQuery
    }: VersionDataOptions = defaultVersionDataOptions
    )
    {
        if( !isNetworkMagic( networkMagic ) )
        throw new Error( `VersionData :: invalid networkMagic: ` + networkMagic );

        this.networkMagic = networkMagic;
        this.initiatorOnlyDiffusionMode = bool( initiatorOnlyDiffusionMode, true );
        this.peerSharing = bool( peerSharing, true );
        this.query = bool( query, true );

        this.includePeerSharing = bool( includePeerSharing, defaultVersionDataOptions.includePeerSharing );
        this.includeQuery = bool( includeQuery, defaultVersionDataOptions.includeQuery );
    }

    clone(): VersionData
    {
        return new VersionData(
            {
                networkMagic: this.networkMagic,
                initiatorOnlyDiffusionMode: this.initiatorOnlyDiffusionMode,
                peerSharing: this.peerSharing,
                query: this.query,
            },
            {
                includePeerSharing: this.includePeerSharing,
                includeQuery: this.includeQuery,
            }
        );
    }

    static mainnet({
        initiatorOnlyDiffusionMode,
        peerSharing,
        query
    }: OptField<IVersionData, "networkMagic"> = {}): VersionData
    {
        return new VersionData({
            networkMagic: CardanoNetworkMagic.Mainnet,
            initiatorOnlyDiffusionMode,
            peerSharing,
            query,
        });
    }

    static preview({
        initiatorOnlyDiffusionMode,
        peerSharing,
        query
    }: OptField<IVersionData, "networkMagic"> = {}): VersionData
    {
        return new VersionData({
            networkMagic: CardanoNetworkMagic.Preview,
            initiatorOnlyDiffusionMode,
            peerSharing,
            query,
        });
    }

    static preprod({
        initiatorOnlyDiffusionMode,
        peerSharing,
        query
    }: OptField<IVersionData, "networkMagic"> = {}): VersionData
    {
        return new VersionData({
            networkMagic: CardanoNetworkMagic.Preprod,
            initiatorOnlyDiffusionMode,
            peerSharing,
            query,
        });
    }

    static testnet = VersionData.preprod;

    static sanchonet({
        initiatorOnlyDiffusionMode,
        peerSharing,
        query
    }: OptField<IVersionData, "networkMagic"> = {}): VersionData
    {
        return new VersionData({
            networkMagic: CardanoNetworkMagic.Sanchonet,
            initiatorOnlyDiffusionMode,
            peerSharing,
            query,
        });
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborObj
    {
        // old n2n version data
        // nodeToNodeVersionData = [ networkMagic, initiatorOnlyDiffusionMode ]
        if( !this.includePeerSharing )
        return new CborArray([
            new CborUInt( this.networkMagic ),
            new CborSimple( this.initiatorOnlyDiffusionMode ),
        ]);
        
        // n2c
        // nodeToClientVersionData = [networkMagic, query]
        if( this.includeQuery && !this.includePeerSharing )
        return new CborArray([
            new CborUInt( this.networkMagic ),
            new CborSimple( this.query ),
        ]);

        // nodeToNodeVersionData = [ networkMagic, initiatorOnlyDiffusionMode, peerSharing, query ]
        return new CborArray([
            new CborUInt(   this.networkMagic ),
            new CborSimple( this.initiatorOnlyDiffusionMode ),
            new CborSimple( this.peerSharing ),
            new CborSimple( this.query ),
        ].filter( v => v !== undefined ));
    }

    static fromCbor( cbor: CanBeCborString, n2n: boolean = true ): VersionData
    { 
        return VersionData.fromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
    }
    static fromCborObj( cbor: CborObj, n2n: boolean = true ): VersionData
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array.length !== 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborSimple
        )) throw new Error("invalid CBOR for 'VersionData'");

        n2n = bool( n2n, true );
        const len = cbor.array.length;

        if( len === 2 )
        {
            if( n2n ) // nodeToNodeVersionData (< 11)
            {
                return new VersionData({
                    networkMagic: Number( cbor.array[0].num ),
                    initiatorOnlyDiffusionMode: bool( cbor.array[1].simple, false ),
                    peerSharing: false,
                    query: false,
                }, {
                    includePeerSharing: false,
                    includeQuery: false,
                });
            }
            else // nodeToClientVersionData
            {
                return new VersionData({
                    networkMagic: Number( cbor.array[0].num ),
                    initiatorOnlyDiffusionMode: false,
                    peerSharing: false,
                    query: bool( cbor.array[1].simple, false ),
                }, {
                    includePeerSharing: false,
                    includeQuery: true,
                });
            }
        }

        if(!(
            cbor.array[2] instanceof CborSimple &&
            cbor.array[3] instanceof CborSimple
        )) throw new Error("invalid CBOR for 'VersionData'");

        return new VersionData({
            networkMagic: Number( cbor.array[0].num ),
            initiatorOnlyDiffusionMode: bool( cbor.array[1].simple, false ),
            peerSharing: bool( cbor.array[2].simple, false ),
            query: bool( cbor.array[3].simple, false ),
        }, {
            includePeerSharing: true,
            includeQuery: true,
        });
    }
}