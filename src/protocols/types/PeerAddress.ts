import { CborArray, CborObj, CborUInt } from "@harmoniclabs/cbor";
import { isIPv4, PeerAddressIPv4 } from "./PeerAddressIPv4";
import { isIPv6, PeerAddressIPv6 } from "./PeerAddressIPv6";

export type PeerAddress = PeerAddressIPv4 | PeerAddressIPv6;

export function isValidPeerAddress( stuff: any ): stuff is PeerAddress {
    if( stuff instanceof PeerAddressIPv4 ) return isIPv4( stuff );
    if( stuff instanceof PeerAddressIPv6 ) return isIPv6( stuff );
    
    return false;
}

export function addressToCborObj( peerAddress: PeerAddress ): CborArray {
    if(!( isValidPeerAddress( peerAddress ) )) throw new Error("invalid `PeerAddress`");

    if( peerAddress instanceof PeerAddressIPv4 ) return PeerAddressIPv4.addressToCborObj( peerAddress );
    else return PeerAddressIPv6.addressToCborObj( peerAddress );
}

export function cborObjToAddress( cbor: CborObj ): PeerAddress {
    if(!(
        cbor instanceof CborArray &&
        cbor.array[0] instanceof CborUInt &&
        cbor.array[0].num >= 0 &&
        cbor.array[0].num <= 1
    )) throw new Error("invalid CBOR for `IPeerAddress`");

    if( cbor.array[0].num == BigInt(0) ) return PeerAddressIPv4.cborObjToAddress( cbor );
    else return PeerAddressIPv6.cborObjToAddress( cbor );
}