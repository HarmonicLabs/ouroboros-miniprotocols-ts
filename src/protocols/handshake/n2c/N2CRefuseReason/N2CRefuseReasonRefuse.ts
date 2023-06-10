import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborText, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { OldN2CVersionNumber, isOldN2CVersionNumber, canBeOldN2CVersionNumber, forceOldN2CVersionNumber } from "../N2CHandshakeVersion";

export interface IN2CRefuseReasonRefuse {
    version: OldN2CVersionNumber,
    errorMessage: string
}

export class N2CRefuseReasonRefuse
    implements ToCbor, ToCborObj, IN2CRefuseReasonRefuse
{
    readonly version: OldN2CVersionNumber;
    readonly errorMessage: string;

    constructor({ version, errorMessage }: IN2CRefuseReasonRefuse)
    {
        if(!isOldN2CVersionNumber( version ))
        throw new Error("invalid 'validVerisons' for 'N2CRefuseReasonRefuse'");

        Object.defineProperties(
            this, {
                version: {
                    value: version,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                errorMessage: {
                    value: String( errorMessage ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
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
            new CborUInt( 2 ),
            new CborUInt( this.version ),
            new CborText( this.errorMessage )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2CRefuseReasonRefuse
    {
        return N2CRefuseReasonRefuse.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CRefuseReasonRefuse
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2CRefuseReasonRefuse'");

        const [ idx, _v, _txt ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(2)
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonRefuse'; invalid reason index");

        if(!(
            _v instanceof CborUInt &&
            canBeOldN2CVersionNumber( _v.num )
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonRefuse'; invalid old version");

        if(!(
            _txt instanceof CborText
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonRefuse'; invalid error message");

        return new N2CRefuseReasonRefuse({
            version: forceOldN2CVersionNumber( _v.num ),
            errorMessage: _txt.text
        });
    }
}