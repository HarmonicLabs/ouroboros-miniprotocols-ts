import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { adaptVersionNumberToMode, isExtendedVersionNumber, VersionNumber } from "../../HandshakeVersionTable/VersionNumber";

export interface IRefuseReasonVersionMismatch {
    validVersions: VersionNumber[]
}

export class RefuseReasonVersionMismatch
    implements ToCborString, ToCborObj, IRefuseReasonVersionMismatch
{
    readonly validVersions: VersionNumber[];

    readonly isN2N: boolean = true;

    constructor(
        validVersions: VersionNumber[],
        n2n: boolean = true
    )
    {
        if(!(
            Array.isArray( validVersions ) && 
            validVersions.every( isExtendedVersionNumber ) 
        ))
        throw new Error("invalid 'validVerisons' for 'RefuseReasonVersionMismatch'");

        this.validVersions = validVersions.filter( ( v, i, thisArr ) => thisArr.indexOf(v) === i);
        this.isN2N = n2n;
    }

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() )
    }
    toCborObj( n2n: boolean | undefined = undefined ): CborArray
    {
        return new CborArray([
            new CborUInt( 0 ),
            new CborArray(
                this.validVersions.map( v => 
                    new CborUInt(
                        adaptVersionNumberToMode( v, this.isN2N )
                    )
                )
            )
        ]);
    }

    static fromCbor( cbor: CanBeCborString, n2n: boolean = true ): RefuseReasonVersionMismatch
    {
        return RefuseReasonVersionMismatch.fromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
    }
    static fromCborObj( cbor: CborObj, n2n: boolean = true ): RefuseReasonVersionMismatch
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'RefuseReasonVersionMismatch'");

        const [ idx, _versions ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(0)
        )) throw new Error("invalid CBOR for 'RefuseReasonVersionMismatch'; invalid reason index");

        if(!(
            _versions instanceof CborArray
        )) throw new Error("invalid CBOR for 'RefuseReasonVersionMismatch'; invalid versions field");

        return new RefuseReasonVersionMismatch(
            _versions.array.map( v => {
                if(!(
                    v instanceof CborUInt
                )) throw new Error("invalid CBOR for 'VersionNumber'");
                
                return VersionNumber( v.num )
            }),
            n2n
        );
    }
}