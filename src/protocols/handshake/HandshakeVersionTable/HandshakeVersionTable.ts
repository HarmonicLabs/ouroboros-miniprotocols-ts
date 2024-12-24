import { isObject } from "@harmoniclabs/obj-utils";
import { safeParseInt } from "../../utils/safeParseInt";
import { isIVersionData, IVersionData, VersionData } from "./VersionData";
import { isExtendedVersionNumber, isVersionNumber, toClientVersionNumber, VersionNumber } from "./VersionNumber";
import { CanBeCborString, Cbor, forceCborString, CborObj, CborMap, CborUInt, CborString } from "@harmoniclabs/cbor";
import { AsOptions } from "../../types/AsOptions";

export interface IVersionTableMap {
    [ version: number ]: IVersionData
}

export interface VersionTableMap {
    [ version: VersionNumber ]: VersionData
}

export function isVersionTableMap( stuff: any ): stuff is VersionTableMap
{
    return (
        isObject( stuff ) &&
        Object.keys( stuff ).every( k => 
            isExtendedVersionNumber( k ) &&
            stuff[ VersionNumber( k ) ] instanceof VersionData
        )
    );
}

export function isIVersionTableMap( stuff: any ): stuff is IVersionTableMap
{
    return (
        isObject( stuff ) &&
        Object.keys( stuff ).every( k => 
            isVersionNumber( k ) &&
            isIVersionData( stuff[ VersionNumber( k ) ] )
        )
    );
}

export function getSortedVersions( versionTable: IVersionTableMap | VersionTableMap ): VersionNumber[]
{
    return Object.keys( versionTable )
    .map( safeParseInt ) 
    .filter<number>( ((v => typeof v === "number") as (v: any) => v is number) )
    .map( VersionNumber )
    .sort( (a, b) => a - b );
}

export function normalizeVersionTableMap( versionTable: IVersionTableMap | VersionTableMap ): VersionTableMap
{
    const normalized: VersionTableMap = {};

    const versions = getSortedVersions( versionTable );

    for( const version of versions )
    {
        const data = versionTable[ version ];
        normalized[ version ] =
            data instanceof VersionData ? data.clone() : 
            new VersionData( versionTable[ version ] );

        if( version <= 10 )
        {
            const data = normalized[ version ];
            normalized[ version ] = new VersionData(
                data,
                {
                    includePeerSharing: false,
                    includeQuery: false
                }
            );
        }
    }

    return normalized;
}

export function versionTableFromCbor( cbor: CanBeCborString, n2n: boolean = true ): VersionTableMap
{
    return versionTableFromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
}
export function versionTableFromCborObj( cbor: CborObj, n2n: boolean = true ): VersionTableMap
{
    if(!(cbor instanceof CborMap)) throw new Error("invalid CBOR for 'N2NVersionTable'");

    const entries = cbor.map;

    const result: VersionTableMap = {};

    for( const { k, v } of entries )
    {
        if(!(k instanceof CborUInt) )
        throw new Error("invalid CBOR for 'VersionTableMap'; invalid 'VersionNumber'");

        let n = Number( k.num );

        if( !isExtendedVersionNumber( n ) )
        throw new Error("invalid CBOR for 'VersionTableMap'; invalid 'OldN2NVersionNumber'");

        n = VersionNumber( n );

        result[ n ] = VersionData.fromCborObj( v, n2n );
    }

    return normalizeVersionTableMap( result );
}

export function versionTableToCbor( versionTable: VersionTableMap, n2n: boolean = true ): CborString
{
    return Cbor.encode( versionTableToCborObj( versionTable ) );
}
export function versionTableToCborObj( versionTable: VersionTableMap, n2n: boolean = true ): CborMap
{
    return new CborMap(
        getSortedVersions( versionTable )
        .map( ver => ({
            k: new CborUInt(
                n2n ? ver : toClientVersionNumber( ver )
            ),
            v: versionTable[ ver ].toCborObj()
        }))
    );
}