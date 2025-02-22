import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { isByte } from "../../utils/isByte";

export interface IPeerSharingRequest {
    amount: number | bigint;
}

export function isIPeerSharingRequest( stuff: any ): stuff is IPeerSharingRequest {
    return isObject( stuff );
}

export class PeerSharingRequest implements ToCborString, ToCborObj, IPeerSharingRequest
{
    readonly amount: number;
    
    constructor( { amount } : IPeerSharingRequest ) {
        if( !isByte( amount ) ) throw new Error("peer sharing amount is not a number within a byte");

        this.amount = Number( amount ) & 0xff;
    }

    
    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray {
        return new CborArray([
            new CborUInt( 0 ),
            new CborUInt( this.amount )
        ]);
    }

    static fromCborObj( cbor: CborObj ): PeerSharingRequest {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[0].num === BigInt( 0 )
        )) throw new Error("invalid CBOR for 'PeerSharingRequest'");

        return new PeerSharingRequest({
            amount: cbor.array[1].num
        });
    }

    static fromCbor( cbor: CanBeCborString ): PeerSharingRequest {
        const buff = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
    
        const msg = PeerSharingRequest.fromCborObj(Cbor.parse( buff ));

        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;

        return msg;    
    }

}