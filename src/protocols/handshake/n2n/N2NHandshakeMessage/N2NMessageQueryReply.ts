import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2NVersionTable, IN2NVersionTable, isIN2NVersionTable } from "../N2NVersionTable";

export interface IN2NMessageQueryReply {
    versionTable: N2NVersionTable | IN2NVersionTable
}

export class N2NMessageQueryReply
    implements ToCbor, ToCborObj, IN2NMessageQueryReply
{
    readonly versionTable: N2NVersionTable

    constructor({ versionTable }: IN2NMessageQueryReply)
    {
        versionTable = isIN2NVersionTable( versionTable ) ? new N2NVersionTable( versionTable ) : versionTable;
        
        if(!(versionTable instanceof N2NVersionTable))
        throw new Error("invalid verisionTable for 'N2NMessageQueryReply'");

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

    static fromCbor( cbor: CanBeCborString ): N2NMessageQueryReply
    {
        return N2NMessageQueryReply.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NMessageQueryReply
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2NMessageQueryReply'");

        const [ idx, _versions ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(3)
        )) throw new Error("invalid CBOR for 'N2NMessageQueryReply'; invalid messge index");


        return new N2NMessageQueryReply({
            versionTable: N2NVersionTable.fromCborObj( _versions )
        });
    }
}