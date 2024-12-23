import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborText, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { adaptVersionNumberToMode, isExtendedVersionNumber, VersionNumber } from "../../HandshakeVersionTable/VersionNumber";

export interface IRefuseReasonRefuse {
    version: VersionNumber,
    errorMessage: string
}

export class RefuseReasonRefuse
    implements ToCbor, ToCborObj, IRefuseReasonRefuse
{
    readonly version: VersionNumber;
    readonly errorMessage: string;

    readonly isN2N: boolean = true;

    constructor(
        { version, errorMessage }: IRefuseReasonRefuse,
        n2n: boolean = true
    )
    {
        if(!isExtendedVersionNumber( version ))
        throw new Error("invalid 'validVerisons' for 'RefuseReasonRefuse'");

        this.version = VersionNumber( version );
        this.errorMessage = String( errorMessage );

        this.isN2N = n2n;
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() )
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt( 2 ),
            new CborUInt( adaptVersionNumberToMode( this.version, this.isN2N ) ),
            new CborText( this.errorMessage )
        ]);
    }

    static fromCbor( cbor: CanBeCborString, n2n: boolean = true ): RefuseReasonRefuse
    {
        return RefuseReasonRefuse.fromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
    }
    static fromCborObj( cbor: CborObj, n2n: boolean = true ): RefuseReasonRefuse
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'RefuseReasonRefuse'");

        const [ idx, _v, _txt ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(2)
        )) throw new Error("invalid CBOR for 'RefuseReasonRefuse'; invalid reason index");

        if(!(
            _v instanceof CborUInt &&
            isExtendedVersionNumber( _v.num )
        )) throw new Error("invalid CBOR for 'RefuseReasonRefuse'; invalid old version");

        if(!(
            _txt instanceof CborText
        )) throw new Error("invalid CBOR for 'RefuseReasonRefuse'; invalid error message");

        return new RefuseReasonRefuse({
            version: VersionNumber( _v.num ),
            errorMessage: _txt.text
        }, n2n);
    }
}