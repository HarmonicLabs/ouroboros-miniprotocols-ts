import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2NVersionData, isIN2NVersionData } from "../N2NVersionData";
import { N2CHandshakeVersion } from "../../n2c/N2CHandshakeVersion";
import { N2NHandshakeVersion, canBeOldN2NVersionNumber, forceN2NVersionNumber, forceOldN2NVersionNumber, isN2NVersionNumber, isOldN2NVersionNumber } from "../N2NHandshakeVersion";

export interface IN2NMessageAcceptVersion{
    version: N2NHandshakeVersion,
    data: N2NVersionData
}

export class N2NMessageAcceptVersion
    implements ToCbor, ToCborObj, IN2NMessageAcceptVersion
{
    readonly version: N2NHandshakeVersion
    readonly data: N2NVersionData;

    constructor({ version, data }: IN2NMessageAcceptVersion)
    {
        if(!isN2NVersionNumber( version )) throw new Error("invalid verision for 'OldN2NVersionNumber'");
        if(!isIN2NVersionData( data )) throw new Error("invalid data for 'OldN2NVersionNumber'");

        Object.defineProperties(
            this, {
                version: {
                    value: version,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                data: {
                    value: new N2NVersionData( data ),
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

    static fromCbor( cbor: CanBeCborString ): N2NMessageAcceptVersion
    {
        return N2NMessageAcceptVersion.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NMessageAcceptVersion
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2NMessageAcceptVersion'");

        const [ idx, _version, _data ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(1)
        )) throw new Error("invalid CBOR for 'N2NMessageAcceptVersion'; invalid messge index");

        if(!(
            _version instanceof CborUInt &&
            canBeOldN2NVersionNumber( _version.num )
        )) throw new Error("invalid CBOR for 'N2NMessageAcceptVersion'; invalid messge index");

        return new N2NMessageAcceptVersion({
            version: forceN2NVersionNumber( _version.num ),
            data: N2NVersionData.fromCborObj( _data )
        });
    }
}