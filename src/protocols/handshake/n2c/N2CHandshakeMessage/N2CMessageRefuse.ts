import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2CRefuseReason, isN2CRefuseReason, n2cRefuseReasonFromCborObj } from "../N2CRefuseReason";

export interface IN2CMessageRefuse {
    reason: N2CRefuseReason
}

export class N2CMessageRefuse
    implements ToCbor, ToCborObj, IN2CMessageRefuse
{
    readonly reason: N2CRefuseReason

    constructor({ reason }: IN2CMessageRefuse)
    {   
        if(!isN2CRefuseReason( reason ))
        throw new Error("invalid reason for 'N2CMessageRefuse'");

        Object.defineProperty(
            this, "reason", {
                value: reason,
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
            new CborUInt( 2 ),
            this.reason.toCborObj()
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): N2CMessageRefuse
    {
        return N2CMessageRefuse.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CMessageRefuse
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2CMessageRefuse'");

        const [ idx, _reason ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(2)
        )) throw new Error("invalid CBOR for 'N2CMessageRefuse'; invalid messge index");


        return new N2CMessageRefuse({
            reason: n2cRefuseReasonFromCborObj( _reason )
        });
    }
}