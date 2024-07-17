import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getCborBytesDescriptor } from "../../utils/getCborBytesDescriptor";
import { isByte } from "../../utils/isByte";

export interface IPeerSharingRequest {
    amount: number | bigint;
}

export function isIPeerSharingRequest( stuff: any ): stuff is IPeerSharingRequest {
    return isObject( stuff );
}

export class PeerSharingRequest implements ToCbor, ToCborObj, IPeerSharingRequest {
    
    readonly cborBytes?: Uint8Array | undefined;
    
    readonly amount: number;
    
    constructor( { amount } : IPeerSharingRequest ) {
        if( !isByte( amount ) ) throw new Error("peer sharing amount is not a number within a byte");

        Object.defineProperties(
            this, {
                cborBytes: getCborBytesDescriptor(),
                amount: {
                    value: Number( amount ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    toCborObj(): CborArray {
        return new CborArray([
            new CborUInt( 0 ),
            new CborUInt( this.amount )
        ]);
    }

    toCborBytes(): Uint8Array {
        if(!( this.cborBytes instanceof Uint8Array )) {
            // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.
            this.cborBytes = Cbor.encode( this.toCborObj() ).toBuffer();
        }

        return Uint8Array.prototype.slice.call( this.cborBytes );
    }

    toCbor(): CborString {
        return new CborString( this.toCborBytes() );
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