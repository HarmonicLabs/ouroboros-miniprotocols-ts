import { CborArray, CborObj, CborUInt } from "@harmoniclabs/cbor";
import { isIPeerAddressIPv4, PeerAddressIPv4 } from "./PeerAddressIPv4";
import { isIPeerAddressIPv6, PeerAddressIPv6 } from "./PeerAddressIPv6";

export type PeerAddress = PeerAddressIPv4 | PeerAddressIPv6;

export function isValidPeerAddress( stuff: any ): stuff is PeerAddress 
{
    if( stuff instanceof PeerAddressIPv4 ) return isIPeerAddressIPv4( stuff );
    if( stuff instanceof PeerAddressIPv6 ) return isIPeerAddressIPv6( stuff );
    
    return false;
}

export function peerAddressFromCborObj( cbor: CborObj ): PeerAddress
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array[0] instanceof CborUInt &&
        cbor.array[0].num >= 0 &&
        cbor.array[0].num <= 1
    )) throw new Error("invalid CBOR for `IPeerAddress`");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return PeerAddressIPv4.fromCborObj( cbor );
    if( idx === 1 ) return PeerAddressIPv6.fromCborObj( cbor );

    throw new Error("invalid CBOR for `IPeerAddress`");
}