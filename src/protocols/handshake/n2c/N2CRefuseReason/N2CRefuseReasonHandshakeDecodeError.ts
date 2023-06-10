import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborText, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { OldN2CVersionNumber, canBeOldN2CVersionNumber, forceOldN2CVersionNumber, isOldN2CVersionNumber } from "../N2CHandshakeVersion";

export interface IN2CRefuseReasonHandshakeDecodeError {
    version: OldN2CVersionNumber,
    decodeError: string
}

export class N2CRefuseReasonHandshakeDecodeError
    implements ToCbor, ToCborObj, IN2CRefuseReasonHandshakeDecodeError
{
    readonly version: OldN2CVersionNumber;
    readonly decodeError: string;

    constructor({ version, decodeError }: IN2CRefuseReasonHandshakeDecodeError)
    {
        if(!isOldN2CVersionNumber( version ))
        throw new Error("invalid 'validVerisons' for 'N2CRefuseReasonHandshakeDecodeError'");

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

    static fromCbor( cbor: CanBeCborString ): N2CRefuseReasonHandshakeDecodeError
    {
        return N2CRefuseReasonHandshakeDecodeError.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CRefuseReasonHandshakeDecodeError
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2CRefuseReasonHandshakeDecodeError'");

        const [ idx, _v, _txt ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(1)
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonHandshakeDecodeError'; invalid reason index");

        if(!(
            _v instanceof CborUInt &&
            canBeOldN2CVersionNumber( _v.num )
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonHandshakeDecodeError'; invalid old version");

        if(!(
            _txt instanceof CborText
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonHandshakeDecodeError'; invalid error message");

        return new N2CRefuseReasonHandshakeDecodeError({
            version: forceOldN2CVersionNumber( _v.num ),
            decodeError: _txt.text
        });
    }
}