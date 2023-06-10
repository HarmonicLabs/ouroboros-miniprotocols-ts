import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2CVersionTable, IN2CVersionTable, isIN2CVersionTable } from "../N2CVersionTable";

export interface IN2CMessageProposeVersion {
    versionTable: N2CVersionTable | IN2CVersionTable
}

export class N2CMessageProposeVersion
    implements ToCbor, ToCborObj, IN2CMessageProposeVersion
{
    readonly versionTable: N2CVersionTable

    constructor({ versionTable }: IN2CMessageProposeVersion)
    {
        versionTable = versionTable instanceof N2CVersionTable ? versionTable : new N2CVersionTable( versionTable );
        
        if(!(versionTable instanceof N2CVersionTable))
        throw new Error("invalid verisionTable for 'N2CMessageProposeVersion'");

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

    static fromCbor( cbor: CanBeCborString ): N2CMessageProposeVersion
    {
        return N2CMessageProposeVersion.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CMessageProposeVersion
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2CMessageProposeVersion'");

        const [ idx, _versions ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(0)
        )) throw new Error("invalid CBOR for 'N2CMessageProposeVersion'; invalid messge index");


        return new N2CMessageProposeVersion({
            versionTable: N2CVersionTable.fromCborObj( _versions )
        });
    }
}