import { CanBeCborString, Cbor, CborArray, CborObj, CborSimple, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { NetworkMagic, isNetworkMagic, forceNetworkMagic } from "../../types/NetworkMagic";
import { hasOwn, isObject } from "@harmoniclabs/obj-utils";
import { isUpTo12N2NVersionNumber } from "./N2NHandshakeVersion";

export type PeerSharingNumber = 0 | 1 | 2 | 0n | 1n | 2n;

export function isPeerSharingNumber( n: any ): n is PeerSharingNumber
{
    n = Number( n );
    return (
        n === 0 ||
        n === 1 ||
        n === 2
    )
}

export interface IOldN2NVersionData {
    networkMagic: NetworkMagic,
    initiatorAndResponderDiffusionMode: boolean,
}

export interface IUpTo12N2NVersionData extends IOldN2NVersionData {
    peerSharing: PeerSharingNumber,
    query: boolean
}

export type IN2NVersionData = IOldN2NVersionData & Partial<IUpTo12N2NVersionData>;

export function isIOldN2NVersionData( stuff: any ): stuff is IOldN2NVersionData
{
    return (
        isObject( stuff ) &&
        isNetworkMagic( stuff.networkMagic ) &&
        typeof stuff.initiatorAndResponderDiffusionMode === "boolean"
    );
}

export function isIUpTo12N2NVersionData( stuff: any ): stuff is IUpTo12N2NVersionData
{
    return (
        isIOldN2NVersionData( stuff ) &&
        isPeerSharingNumber( (stuff as any).peerSharing ) &&
        typeof (stuff as any).query === "boolean"
    );
}

export function isIN2NVersionData( stuff: any ): stuff is IN2NVersionData
{
    return isIOldN2NVersionData( stuff )
    // || isUpTo12N2NVersionNumber( stuff ); // not required since `isIOldN2NVersionData( stuff ) is false
}

export type OldN2NVersionData = N2NVersionData & { peerSharing: undefined, query: undefined  };
export type UpTo12N2NVersionData = N2NVersionData & IUpTo12N2NVersionData;

export class N2NVersionData
    implements ToCbor, ToCborObj
{
    readonly networkMagic!: NetworkMagic;
    readonly initiatorAndResponderDiffusionMode!: boolean;
    readonly peerSharing?: PeerSharingNumber;
    readonly query?: boolean;

    constructor({
        networkMagic,
        initiatorAndResponderDiffusionMode,
        peerSharing,
        query
    }: IN2NVersionData)
    {
        if( !isNetworkMagic( networkMagic ) ) throw new Error("invalid network magic");
        if( peerSharing !== undefined && !isPeerSharingNumber( peerSharing ) ) throw new Error("invalid peer sharing number");
        if( query !== undefined && typeof query !== "boolean" ) throw new Error("invalid query option");

        Object.defineProperties(
            this, {
                networkMagic: {
                    value: networkMagic,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                initiatorAndResponderDiffusionMode: {
                    value: Boolean( initiatorAndResponderDiffusionMode ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                peerSharing: {
                    value: peerSharing,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                query: {
                    value: query,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt( this.networkMagic ),
            new CborSimple( this.initiatorAndResponderDiffusionMode )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2NVersionData
    {
        return N2NVersionData.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NVersionData
    {
        if( !(cbor instanceof CborArray) ) throw new Error("invalid CBOR for N2NVersionData");
        const [ _net, _diffusionMode, _peerSharing, _query ] = cbor.array;
        if(!(
            _net instanceof CborUInt &&
            _diffusionMode instanceof CborSimple
        )) throw new Error("invalid CBOR for N2NVersionData");

        if( !(typeof _diffusionMode.simple === "boolean") )
        throw new Error("invalid CBOR for N2NVersionData");

        let peerSharing: PeerSharingNumber | undefined = undefined;
        let query: boolean | undefined = undefined;

        if( _peerSharing || _query )
        {
            if(!(
                _peerSharing instanceof CborUInt &&
                isPeerSharingNumber( _peerSharing.num )
            )) throw new Error("invalid peerSharing CBOR format");

            if(!(
                _query instanceof CborSimple &&
                typeof _query.simple === "boolean"
            )) throw new Error("invalid query CBOR format");

            peerSharing = Number( _peerSharing.num ) as PeerSharingNumber;
            query = _query.simple;
        }

        return new N2NVersionData({
            networkMagic: forceNetworkMagic( _net.num ),
            initiatorAndResponderDiffusionMode: _diffusionMode.simple,
            peerSharing,
            query
        });
    }
}