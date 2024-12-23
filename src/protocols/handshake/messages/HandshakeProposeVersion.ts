import { CborString, Cbor, CborUInt, CanBeCborString, forceCborString, CborObj, CborArray } from "@harmoniclabs/cbor";
import { normalizeVersionTableMap, versionTableFromCborObj, VersionTableMap, versionTableToCborObj } from "../HandshakeVersionTable/HandshakeVersionTable";

export interface IHandshakeProposeVersion {
    versionTable: VersionTableMap
}

export class HandshakeProposeVersion
    implements IHandshakeProposeVersion
{
    readonly versionTable: VersionTableMap;
    readonly isN2N: boolean = true;

    constructor(
        { versionTable }: IHandshakeProposeVersion,
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
            new CborUInt(0),
            versionTableToCborObj( this.versionTable, this.isN2N )
        ]);
    }

    static fromCbor( cbor: CanBeCborString, n2n: boolean = true ): HandshakeProposeVersion
    {
        return HandshakeProposeVersion.fromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
    }
    static fromCborObj( cbor: CborObj, n2n: boolean = true ): HandshakeProposeVersion
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            Number(cbor.array[0].num) === 0
        )) throw new Error("invalid CBOR for 'N2NVersionTable'");

        return new HandshakeProposeVersion({
            versionTable: versionTableFromCborObj( cbor.array[1], n2n )
        }, n2n);
    }
}