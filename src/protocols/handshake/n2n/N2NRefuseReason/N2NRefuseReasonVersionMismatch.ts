import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { OldN2NVersionNumber, forceOldN2NVersionNumber, isOldN2NVersionNumber } from "../N2NHandshakeVersion";

export interface IN2NRefuseReasonVersionMismatch {
    validVersions: OldN2NVersionNumber[]
}

export class N2NRefuseReasonVersionMismatch
    implements ToCbor, ToCborObj, IN2NRefuseReasonVersionMismatch
{
    readonly validVersions: OldN2NVersionNumber[];

    constructor( validVersions: OldN2NVersionNumber[] )
    {
        if(!(
            Array.isArray( validVersions ) && 
            validVersions.every( isOldN2NVersionNumber ) 
        ))
        throw new Error("invalid 'validVerisons' for 'N2NRefuseReasonVersionMismatch'");

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

    static fromCbor( cbor: CanBeCborString ): N2NRefuseReasonVersionMismatch
    {
        return N2NRefuseReasonVersionMismatch.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NRefuseReasonVersionMismatch
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2NRefuseReasonVersionMismatch'");

        const [ idx, _versions ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(0)
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonVersionMismatch'; invalid reason index");

        if(!(
            _versions instanceof CborArray
        )) throw new Error("invalid CBOR for 'N2NRefuseReasonVersionMismatch'; invalid versions field");

        return new N2NRefuseReasonVersionMismatch(
            _versions.array.map( v => {
                if(!(
                    v instanceof CborUInt
                )) throw new Error("invalid CBOR for 'OldN2NVersionNumber'");
                
                return forceOldN2NVersionNumber( v.num )
            })
        );
    }
}