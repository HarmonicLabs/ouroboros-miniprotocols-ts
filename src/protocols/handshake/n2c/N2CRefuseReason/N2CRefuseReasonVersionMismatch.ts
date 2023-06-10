import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { OldN2CVersionNumber, forceOldN2CVersionNumber, isOldN2CVersionNumber } from "../N2CHandshakeVersion";

export interface IN2CRefuseReasonVersionMismatch {
    validVersions: OldN2CVersionNumber[]
}

export class N2CRefuseReasonVersionMismatch
    implements ToCbor, ToCborObj, IN2CRefuseReasonVersionMismatch
{
    readonly validVersions: OldN2CVersionNumber[];

    constructor( validVersions: OldN2CVersionNumber[] )
    {
        if(!(
            Array.isArray( validVersions ) && 
            validVersions.every( isOldN2CVersionNumber ) 
        ))
        throw new Error("invalid 'validVerisons' for 'N2CRefuseReasonVersionMismatch'");

        Object.defineProperty(
            this, "validVersions", {
                value: Object.freeze( validVersions.filter( ( v, i, thisArr ) => thisArr.indexOf(v) === i) ),
                writable: false,
                enumerable: true,
                configurable: false
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
            new CborUInt( 0 ),
            new CborArray( this.validVersions.map( v => new CborUInt( v ) ))
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2CRefuseReasonVersionMismatch
    {
        return N2CRefuseReasonVersionMismatch.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CRefuseReasonVersionMismatch
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2CRefuseReasonVersionMismatch'");

        const [ idx, _versions ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(0)
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonVersionMismatch'; invalid reason index");

        if(!(
            _versions instanceof CborArray
        )) throw new Error("invalid CBOR for 'N2CRefuseReasonVersionMismatch'; invalid versions field");

        return new N2CRefuseReasonVersionMismatch(
            _versions.array.map( v => {
                if(!(
                    v instanceof CborUInt
                )) throw new Error("invalid CBOR for 'OldN2CVersionNumber'");
                
                return forceOldN2CVersionNumber( v.num )
            })
        );
    }
}