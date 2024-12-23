import { CborString, Cbor, CborArray, CborUInt, CanBeCborString, CborObj, forceCborString } from "@harmoniclabs/cbor";
import { RefuseReason, refuseReasonFromCborObj } from "./RefuseReason";

export interface IHandshakeRefuse {
    reason: RefuseReason
}

export class HandshakeRefuse
    implements IHandshakeRefuse
{
    readonly reason: RefuseReason;

    readonly isN2N: boolean = true;

    constructor(
        { reason }: IHandshakeRefuse,
        n2n: boolean = true
    )
    {
        this.reason = reason;
        this.isN2N = n2n;
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

    static fromCbor( cbor: CanBeCborString, n2n: boolean = true ): HandshakeRefuse
    {
        return HandshakeRefuse.fromCborObj( Cbor.parse( forceCborString( cbor ) ), n2n );
    }
    static fromCborObj( cbor: CborObj, n2n: boolean = true ): HandshakeRefuse
    {
        if(!(cbor instanceof CborArray)) throw new Error("invalid CBOR for 'HandshakeRefuse'");

        const [ idx, _reason ] = cbor.array;

        if(!(
            idx instanceof CborUInt &&
            idx.num === BigInt(2)
        )) throw new Error("invalid CBOR for 'HandshakeRefuse'; invalid reason index");

        return new HandshakeRefuse({
            reason: refuseReasonFromCborObj( _reason )
        }, n2n);
    }
}