import { freezeAll, isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborMap, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { OldN2NVersionNumber, UpTo12N2NVersionNumber, isOldN2NVersionNumber, isUpTo12N2NVersionNumber } from "./N2NHandshakeVersion";
import { IN2NVersionData, IUpTo12N2NVersionData, N2NVersionData, OldN2NVersionData, UpTo12N2NVersionData, isIN2NVersionData, isIUpTo12N2NVersionData } from "./N2NVersionData";

export interface IOldN2NVersionTableEntry {
    version: OldN2NVersionNumber,
    data: IN2NVersionData
};

export interface IOldN2NVersionTableEntryAsClass {
    version: OldN2NVersionNumber,
    data: OldN2NVersionData
};

export function isIOldN2NVersionTableEntry( stuff: any ): stuff is IOldN2NVersionTableEntry
{
    return (
        isObject( stuff ) &&
        isOldN2NVersionNumber( stuff.version ) &&
        isIN2NVersionData( stuff.data )
    );
}

export interface IUpTo12N2NVersionTableEntry {
    version: UpTo12N2NVersionNumber,
    data: IUpTo12N2NVersionData
};

export interface IUpTo12N2NVersionTableEntryAsClass {
    version: UpTo12N2NVersionNumber,
    data: UpTo12N2NVersionData
};

export function isIUpTo12N2NVersionTableEntry( stuff: any ): stuff is IUpTo12N2NVersionTableEntry
{
    return (
        isObject( stuff ) &&
        isUpTo12N2NVersionNumber( stuff.version ) &&
        isIUpTo12N2NVersionData( stuff.data )
    );
}

export type IN2NVersionTableEntry = IOldN2NVersionTableEntry | IUpTo12N2NVersionTableEntry;
export type IN2NVersionTableEntryAsClass = IOldN2NVersionTableEntryAsClass | IUpTo12N2NVersionTableEntryAsClass;

export type IN2NVersionTable = IN2NVersionTableEntry[];

export type IN2NVersionTableAsClass = IN2NVersionTableEntryAsClass[];

export function isIN2NVersionTable( stuff: any ): stuff is IN2NVersionTable
{
    return (
        Array.isArray( stuff ) && 
        stuff.every( entry => 
            isIOldN2NVersionTableEntry( entry )    ||
            isIUpTo12N2NVersionTableEntry( entry )
        )
    );
}

export type IUpTo12N2NVersionTable = N2NVersionTable & { entries: IUpTo12N2NVersionTableEntry[] }

export class N2NVersionTable
    implements ToCbor, ToCborObj
{
    readonly entries!: IN2NVersionTableAsClass;

    constructor( entries: IN2NVersionTable )
    {
        if( !isIN2NVersionTable( entries ) ) throw new Error("invalid entries for 'N2NVersionTable'");

        entries = entries.map(({ version, data }) =>
            ({ 
                version, 
                data: 
                    data instanceof N2NVersionData ? 
                    data :
                    new N2NVersionData( data ) 
            } as IN2NVersionTableEntry)
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

    static fromCbor( cbor: CanBeCborString ): N2NVersionTable
    {
        return N2NVersionTable.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NVersionTable
    {
        if(!(cbor instanceof CborMap)) throw new Error("invalid CBOR for 'N2NVersionTable'");

        const entries = cbor.map;

        return new N2NVersionTable(
            entries.map(({ k, v }) => {
                if(!(k instanceof CborUInt) )
                throw new Error("invalid CBOR for 'N2NVersionTable'; invalid 'OldN2NVersionNumber'");

                const n = Number( k.num )

                if( !isOldN2NVersionNumber( n ) )
                throw new Error("invalid CBOR for 'N2NVersionTable'; invalid 'OldN2NVersionNumber'");

                return {
                    version: n,
                    data: N2NVersionData.fromCborObj( v )
                }
            })
        )
    }
}