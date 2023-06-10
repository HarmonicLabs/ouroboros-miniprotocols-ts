import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborText, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { OldN2NVersionNumber, isOldN2NVersionNumber, canBeOldN2NVersionNumber, forceOldN2NVersionNumber } from "../N2NHandshakeVersion";

export interface IN2NRefuseReasonRefuse {
    version: OldN2NVersionNumber,
    errorMessage: string
}

export class N2NRefuseReasonRefuse
    implements ToCbor, ToCborObj, IN2NRefuseReasonRefuse
{
    readonly version: OldN2NVersionNumber;
    readonly errorMessage: string;

    constructor({ version, errorMessage }: IN2NRefuseReasonRefuse)
    {
        if(!isOldN2NVersionNumber( version ))
        throw new Error("invalid 'validVerisons' for 'N2NRefuseReasonRefuse'");

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

    static fromCbor( cbor: CanBeCborString ): N2NRefuseReasonRefuse
    {
        return N2NRefuseReasonRefuse.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NRefuseReasonRefuse
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2NRefuseReasonRefuse'");

        const [ idx, _v, _txt ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(2)
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonRefuse'; invalid reason index");

        if(!(
            _v instanceof CborUInt &&
            canBeOldN2NVersionNumber( _v.num )
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonRefuse'; invalid old version");

        if(!(
            _txt instanceof CborText
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonRefuse'; invalid error message");

        return new N2NRefuseReasonRefuse({
            version: forceOldN2NVersionNumber( _v.num ),
            errorMessage: _txt.text
        });
    }
}