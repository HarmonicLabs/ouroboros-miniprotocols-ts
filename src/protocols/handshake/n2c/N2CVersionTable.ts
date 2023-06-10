import { freezeAll, isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborMap, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { IOldN2CVersionData, IOldN2CVersionDataAsClass, IUpTo16N2CVersionData, N2CVersionData, UpTo16N2CVersionData, isIN2CVersionData, isIOldN2CVersionData, isIUpTo16N2CVersionData } from "./N2CVersionData";
import { isNetworkMagic } from "../../types/NetworkMagic";
import { OldN2CVersionNumber, isOldN2CVersionNumber, UpTo16N2CVersionNumber, isUpTo16N2CVersionNumber } from "./N2CHandshakeVersion";

export interface IOldN2CVersionTableEntry {
    version: OldN2CVersionNumber,
    data: IOldN2CVersionData
};

export interface IOldN2CVersionTableEntryAsClass {
    version: OldN2CVersionNumber,
    data: IOldN2CVersionDataAsClass
}

export function isIOldN2CVersionTableEntry( stuff: any ): stuff is IOldN2CVersionTableEntry
{
    return (
        isObject( stuff ) &&
        isOldN2CVersionNumber( stuff.version ) &&
        isIOldN2CVersionData( stuff.data )
    );
}

export interface IUpTo16N2CVersionTableEntry {
    version: UpTo16N2CVersionNumber,
    data: IUpTo16N2CVersionData
};

export interface IUpTo16N2CVersionTableEntryAsClass {
    version: UpTo16N2CVersionNumber,
    data: UpTo16N2CVersionData
};

export function isIUpTo16N2CVersionTableEntry( stuff: any ): stuff is IUpTo16N2CVersionTableEntry
{
    return (
        isObject( stuff ) &&
        isUpTo16N2CVersionNumber( stuff.version ) &&
        isIUpTo16N2CVersionData( stuff.data )
    );
}

export type IN2CVersionTableEntry = IOldN2CVersionTableEntry | IUpTo16N2CVersionTableEntry;
export type IN2CVersionTableEntryAsClass = IOldN2CVersionTableEntryAsClass | IUpTo16N2CVersionTableEntryAsClass;

export type IN2CVersionTable = IN2CVersionTableEntry[];

export type IN2CVersionTableAsClass = IN2CVersionTableEntryAsClass[];

export function isIN2CVersionTable( stuff: any ): stuff is IN2CVersionTable
{
    return (
        Array.isArray( stuff ) && 
        stuff.every( entry => 
            isIOldN2CVersionTableEntry( entry )    ||
            isIUpTo16N2CVersionTableEntry( entry )
        )
    );
}

export type IUpTo16N2CVersionTable = N2CVersionTable & { entries: IUpTo16N2CVersionTableEntry[] }

export class N2CVersionTable
    implements ToCbor, ToCborObj
{
    readonly entries!: IN2CVersionTableAsClass;

    constructor( entries: IN2CVersionTable )
    {
        if( !isIN2CVersionTable( entries ) ) throw new Error("invalid entries for 'N2CVersionTable'");

        entries = entries.map(({ version, data }) =>
            ({ 
                version, 
                data: 
                    isNetworkMagic( data ) ? new N2CVersionData({ networkMagic: data }):
                    data instanceof N2CVersionData ? data :
                    new N2CVersionData( data )
            } as IN2CVersionTableEntry)
        );
        freezeAll( entries );

        Object.defineProperty(
            this, "entries", {
                value: entries,
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborMap
    {
        return new CborMap(
            this.entries.map(({ version, data }) => 
                ({
                    k: new CborUInt( version ), 
                    v: data.toCborObj() 
                })
            )
        );
    }

    static fromCbor( cbor: CanBeCborString ): N2CVersionTable
    {
        return N2CVersionTable.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CVersionTable
    {
        if(!(cbor instanceof CborMap)) throw new Error("invalid CBOR for 'N2CVersionTable'");

        const entries = cbor.map;

        return new N2CVersionTable(
            entries.map(({ k, v }) => {
                if(!(k instanceof CborUInt) )
                throw new Error("invalid CBOR for 'N2CVersionTable'; invalid 'OldN2CVersionNumber'");

                const n = Number( k.num )

                if( !isOldN2CVersionNumber( n ) )
                throw new Error("invalid CBOR for 'N2CVersionTable'; invalid 'OldN2CVersionNumber'");

                return {
                    version: n,
                    data: N2CVersionData.fromCborObj( v )
                }
            })
        )
    }
}