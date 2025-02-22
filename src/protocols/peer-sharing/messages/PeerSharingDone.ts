import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IPeerSharingDone {}

export function isIPeerSharingDone( stuff: any ): stuff is IPeerSharingDone {
    return isObject( stuff );
}

export class PeerSharingDone implements ToCborString, ToCborObj, IPeerSharingDone {
    constructor() {};

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj() {
        return new CborArray([ new CborUInt(2) ]);
    }

    static fromCbor( cbor: CanBeCborString ): PeerSharingDone
    {
        const buff = cbor instanceof Uint8Array ? cbor: forceCborString( cbor ).toBuffer();
        return PeerSharingDone.fromCborObj( Cbor.parse( buff ) );
    }

    static fromCborObj( cbor: CborObj ): PeerSharingDone {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2)
        )) throw new Error("invalid CBOR for 'PeerSharingDone");

        return new PeerSharingDone();
    }
}
