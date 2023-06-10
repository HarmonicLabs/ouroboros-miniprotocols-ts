import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2NVersionTable, IN2NVersionTable, isIN2NVersionTable } from "../N2NVersionTable";

export interface IN2NMessageProposeVersion {
    versionTable: N2NVersionTable | IN2NVersionTable
}

export class N2NMessageProposeVersion
    implements ToCbor, ToCborObj, IN2NMessageProposeVersion
{
    readonly versionTable: N2NVersionTable

    constructor({ versionTable }: IN2NMessageProposeVersion)
    {
        versionTable = isIN2NVersionTable( versionTable ) ? new N2NVersionTable( versionTable ) : versionTable;
        
        if(!(versionTable instanceof N2NVersionTable))
        throw new Error("invalid verisionTable for 'N2NMessageProposeVersion'");

        Object.defineProperty(
            this, "versionTable", {
                value: versionTable,
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() )
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt( 0 ),
            this.versionTable.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2NMessageProposeVersion
    {
        return N2NMessageProposeVersion.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NMessageProposeVersion
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2NMessageProposeVersion'");

        const [ idx, _versions ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(0)
        )) throw new Error("invalid CBOR for 'N2NMessageProposeVersion'; invalid messge index");


        return new N2NMessageProposeVersion({
            versionTable: N2NVersionTable.fromCborObj( _versions )
        });
    }
}