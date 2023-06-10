import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2CVersionTable, IN2CVersionTable, isIN2CVersionTable } from "../N2CVersionTable";

export interface IN2CMessageQueryReply {
    versionTable: N2CVersionTable | IN2CVersionTable
}

export class N2CMessageQueryReply
    implements ToCbor, ToCborObj, IN2CMessageQueryReply
{
    readonly versionTable: N2CVersionTable

    constructor({ versionTable }: IN2CMessageQueryReply)
    {
        versionTable = isIN2CVersionTable( versionTable ) ? new N2CVersionTable( versionTable ) : versionTable;
        
        if(!(versionTable instanceof N2CVersionTable))
        throw new Error("invalid verisionTable for 'N2CMessageQueryReply'");

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
            new CborUInt( 3 ),
            this.versionTable.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2CMessageQueryReply
    {
        return N2CMessageQueryReply.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CMessageQueryReply
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2CMessageQueryReply'");

        const [ idx, _versions ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(3)
        )) throw new Error("invalid CBOR for 'N2CMessageQueryReply'; invalid messge index");


        return new N2CMessageQueryReply({
            versionTable: N2CVersionTable.fromCborObj( _versions )
        });
    }
}