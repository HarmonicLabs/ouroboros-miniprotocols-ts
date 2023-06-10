import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2CHandshakeVersion, canBeOldN2CVersionNumber, forceN2CVersionNumber, forceOldN2CVersionNumber, isN2CVersionNumber } from "../N2CHandshakeVersion";
import { N2CVersionData, isIN2CVersionData } from "../N2CVersionData";

export interface IN2CMessageAcceptVersion{
    version: N2CHandshakeVersion,
    data: N2CVersionData
}

export class N2CMessageAcceptVersion
    implements ToCbor, ToCborObj, IN2CMessageAcceptVersion
{
    readonly version: N2CHandshakeVersion
    readonly data: N2CVersionData;

    constructor({ version, data }: IN2CMessageAcceptVersion)
    {
        if(!isN2CVersionNumber( version )) throw new Error("invalid verision for 'OldN2CVersionNumber'");
        if(!isIN2CVersionData( data )) throw new Error("invalid data for 'OldN2CVersionNumber'");

        Object.defineProperties(
            this, {
                version: {
                    value: version,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                data: {
                    value: new N2CVersionData( data ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        )
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
            this.data.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2CMessageAcceptVersion
    {
        return N2CMessageAcceptVersion.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CMessageAcceptVersion
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2CMessageAcceptVersion'");

        const [ idx, _version, _data ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(1)
        )) throw new Error("invalid CBOR for 'N2CMessageAcceptVersion'; invalid messge index");

        if(!(
            _version instanceof CborUInt &&
            canBeOldN2CVersionNumber( _version.num )
        )) throw new Error("invalid CBOR for 'N2CMessageAcceptVersion'; invalid messge index");

        return new N2CMessageAcceptVersion({
            version: forceN2CVersionNumber( _version.num ),
            data: N2CVersionData.fromCborObj( _data )
        });
    }
}