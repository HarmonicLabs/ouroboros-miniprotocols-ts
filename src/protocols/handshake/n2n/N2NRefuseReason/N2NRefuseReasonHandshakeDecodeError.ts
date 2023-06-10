import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborText, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { OldN2NVersionNumber, canBeOldN2NVersionNumber, forceOldN2NVersionNumber, isOldN2NVersionNumber } from "../N2NHandshakeVersion";

export interface IN2NRefuseReasonHandshakeDecodeError {
    version: OldN2NVersionNumber,
    decodeError: string
}

export class N2NRefuseReasonHandshakeDecodeError
    implements ToCbor, ToCborObj, IN2NRefuseReasonHandshakeDecodeError
{
    readonly version: OldN2NVersionNumber;
    readonly decodeError: string;

    constructor({ version, decodeError }: IN2NRefuseReasonHandshakeDecodeError)
    {
        if(!isOldN2NVersionNumber( version ))
        throw new Error("invalid 'validVerisons' for 'N2NRefuseReasonHandshakeDecodeError'");

        Object.defineProperties(
            this, {
                version: {
                    value: version,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                decodeError: {
                    value: String( decodeError ),
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
            new CborUInt( 1 ),
            new CborUInt( this.version ),
            new CborText( this.decodeError )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2NRefuseReasonHandshakeDecodeError
    {
        return N2NRefuseReasonHandshakeDecodeError.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NRefuseReasonHandshakeDecodeError
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2NRefuseReasonHandshakeDecodeError'");

        const [ idx, _v, _txt ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(1)
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonHandshakeDecodeError'; invalid reason index");

        if(!(
            _v instanceof CborUInt &&
            canBeOldN2NVersionNumber( _v.num )
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonHandshakeDecodeError'; invalid old version");

        if(!(
            _txt instanceof CborText
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonHandshakeDecodeError'; invalid error message");

        return new N2NRefuseReasonHandshakeDecodeError({
            version: forceOldN2NVersionNumber( _v.num ),
            decodeError: _txt.text
        });
    }
}