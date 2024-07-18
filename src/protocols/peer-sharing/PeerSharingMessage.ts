import { IPeerSharingRequest, PeerSharingRequest } from "./messages/PeerSharingRequest";
import { IPeerSharingResponse, PeerSharingResponse } from "./messages/PeerSharingResponse";
import { IPeerSharingDone, PeerSharingDone } from "./messages/PeerSharingDone";
import { isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, forceCborString } from "@harmoniclabs/cbor";

export type PeerSharingMessage
    = PeerSharingRequest
    | PeerSharingResponse
    | PeerSharingDone

export type IPeerSharingMessage
    = IPeerSharingRequest
    | IPeerSharingResponse
    | IPeerSharingDone

export function isPeerSharingMessage( stuff: any ): stuff is PeerSharingMessage {
    return isObject( stuff ) && (
        stuff instanceof PeerSharingRequest ||
        stuff instanceof PeerSharingResponse ||
        stuff instanceof PeerSharingDone
    );
}

export function isIPeerSharingMessage( stuff: any ): stuff is IPeerSharingMessage {
    return isObject( stuff );
}

export function keepAliveMessageFromCbor( cbor: CanBeCborString ): PeerSharingMessage {
    const buff = cbor instanceof Uint8Array ? 
        cbor : 
        forceCborString( cbor ).toBuffer();
    
    const msg = keepAliveMessageFromCborObj( Cbor.parse( buff ) );

    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
    msg.cborBytes = buff;

    return msg;
}

export function keepAliveMessageFromCborObj( cbor: CborObj ): PeerSharingMessage {
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error( "invalid CBOR for `PeerSharingMessage`" );

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return PeerSharingRequest.fromCborObj( cbor );
    if( idx === 1 ) return PeerSharingResponse.fromCborObj( cbor );
    if( idx === 2 ) return new PeerSharingDone();

    throw new Error( "invalid CBOR for `PeerSharingMessage`; unknown index: " + idx );
}