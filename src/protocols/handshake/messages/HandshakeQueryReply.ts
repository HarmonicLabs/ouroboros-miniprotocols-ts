import { CborString, Cbor, CborUInt, CanBeCborString, forceCborString, CborObj, CborArray } from "@harmoniclabs/cbor";
import { normalizeVersionTableMap, versionTableFromCborObj, VersionTableMap, versionTableToCborObj } from "../HandshakeVersionTable/HandshakeVersionTable";

export interface IHandshakeQueryReply {
    versionTable: VersionTableMap
}

export class HandshakeQueryReply
    implements IHandshakeQueryReply
{
    readonly versionTable: VersionTableMap;
    readonly isN2N: boolean = true;

    constructor(
        { versionTable }: IHandshakeQueryReply,
        n2n: boolean = true
    )
    {
        this.versionTable = normalizeVersionTableMap( versionTable );
        this.isN2N = n2n;
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt(3),
            versionTableToCborObj( this.versionTable, this.isN2N )
        ]);
    }

    static fromCbor( cbor: CanBeCborString, n2n: boolean = true ): HandshakeQueryReply
    {
        return HandshakeQueryReply.fromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
    }
    static fromCborObj( cbor: CborObj, n2n: boolean = true ): HandshakeQueryReply
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            Number(cbor.array[0].num) === 3
        )) throw new Error("invalid CBOR for 'N2NVersionTable'");

        return new HandshakeQueryReply({
            versionTable: versionTableFromCborObj( cbor.array[1], n2n )
        }, n2n);
    }
}