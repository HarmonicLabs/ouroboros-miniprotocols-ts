import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { N2NRefuseReason, isN2NRefuseReason, n2nRefuseReasonFromCborObj } from "../N2NRefuseReason";

export interface IN2NMessageRefuse {
    reason: N2NRefuseReason
}

export class N2NMessageRefuse
    implements ToCbor, ToCborObj, IN2NMessageRefuse
{
    readonly reason: N2NRefuseReason

    constructor({ reason }: IN2NMessageRefuse)
    {   
        if(!isN2NRefuseReason( reason ))
        throw new Error("invalid reason for 'N2NMessageRefuse'");

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

    static fromCbor( cbor: CanBeCborString ): N2NMessageRefuse
    {
        return N2NMessageRefuse.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2NMessageRefuse
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'N2NMessageRefuse'");

        const [ idx, _reason ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(2)
        )) throw new Error("invalid CBOR for 'N2NMessageRefuse'; invalid messge index");


        return new N2NMessageRefuse({
            reason: n2nRefuseReasonFromCborObj( _reason )
        });
    }
}