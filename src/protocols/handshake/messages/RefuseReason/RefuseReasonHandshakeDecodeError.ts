import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborText, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { adaptVersionNumberToMode, isExtendedVersionNumber, isVersionNumber, VersionNumber } from "../../HandshakeVersionTable/VersionNumber";

export interface IRefuseReasonHandshakeDecodeError {
    version: VersionNumber,
    decodeError: string
}

export class RefuseReasonHandshakeDecodeError
    implements ToCbor, ToCborObj, IRefuseReasonHandshakeDecodeError
{
    readonly version: VersionNumber;
    readonly decodeError: string;

    readonly isN2N: boolean = true;

    constructor(
        { version, decodeError }: IRefuseReasonHandshakeDecodeError,
        n2n: boolean = true
    )
    {
        if(!isExtendedVersionNumber( version ))
        throw new Error("invalid 'validVerisons' for 'RefuseReasonHandshakeDecodeError'");

        this.version = VersionNumber( version );
        this.decodeError = String( decodeError );

        this.isN2N = n2n;
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() )
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt( 1 ),
            new CborUInt( adaptVersionNumberToMode( this.version, this.isN2N ) ),
            new CborText( this.decodeError )
        ]);
    }

    static fromCbor( cbor: CanBeCborString, n2n: boolean = true ): RefuseReasonHandshakeDecodeError
    {
        return RefuseReasonHandshakeDecodeError.fromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
    }
    static fromCborObj( cbor: CborObj, n2n: boolean = true ): RefuseReasonHandshakeDecodeError
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'RefuseReasonHandshakeDecodeError'");

        const [ idx, _v, _txt ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(1)
        )) throw new Error("invalid CBOR for 'RefuseReasonHandshakeDecodeError'; invalid reason index");

        if(!(
            _v instanceof CborUInt &&
            isExtendedVersionNumber( _v.num )
        )) throw new Error("invalid CBOR for 'RefuseReasonHandshakeDecodeError'; invalid old version");

        if(!(
            _txt instanceof CborText
        )) throw new Error("invalid CBOR for 'RefuseReasonHandshakeDecodeError'; invalid error message");

        return new RefuseReasonHandshakeDecodeError({
            version: VersionNumber( _v.num ),
            decodeError: _txt.text
        }, n2n);
    }
}