import { CborString, Cbor, CborArray, CborUInt, CanBeCborString, forceCborString, CborObj } from "@harmoniclabs/cbor";
import { VersionData } from "../HandshakeVersionTable/VersionData";
import { adaptVersionNumberToMode, toClientVersionNumber, VersionNumber } from "../HandshakeVersionTable/VersionNumber";
import { bool } from "../../utils/bool";

export interface IHandshakeAcceptVersion {
    versionNumber: VersionNumber,
    versionData: VersionData
}

export class HandshakeAcceptVersion
    implements IHandshakeAcceptVersion
{
    readonly versionNumber: VersionNumber;
    readonly versionData: VersionData;

    readonly isN2N: boolean = true;

    constructor(
        { versionNumber, versionData }: IHandshakeAcceptVersion,
        n2n: boolean = true
    )
    {
        this.versionNumber = versionNumber;
        this.versionData = versionData;

        this.isN2N = bool( n2n, true );
    }

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt(1),
            new CborUInt( adaptVersionNumberToMode( this.versionNumber, this.isN2N ) ),
            this.versionData.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): HandshakeAcceptVersion
    {
        return HandshakeAcceptVersion.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): HandshakeAcceptVersion
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 3 &&
            cbor.array[0] instanceof CborUInt &&
            Number(cbor.array[0].num) === 1 &&
            cbor.array[1] instanceof CborUInt
        )) throw new Error("invalid CBOR for 'HandshakeAcceptVersion'");

        return new HandshakeAcceptVersion({
            versionNumber: VersionNumber( Number( cbor.array[1].num ) ),
            versionData: VersionData.fromCborObj( cbor.array[2] )
        });
    }
}