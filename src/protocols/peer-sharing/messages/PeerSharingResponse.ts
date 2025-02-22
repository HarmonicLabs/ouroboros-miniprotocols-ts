import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { PeerAddress, isValidPeerAddress, peerAddressFromCborObj } from "../PeerAddress/PeerAddress";

export interface IPeerSharingResponse {
    peerAddresses: PeerAddress[];
}

export class PeerSharingResponse implements ToCborString, ToCborObj, IPeerSharingResponse
{
    readonly peerAddresses: PeerAddress[];
    
    constructor( { peerAddresses } : IPeerSharingResponse ) {
        if( !(
            Array.isArray( peerAddresses ) &&
            peerAddresses.every( isValidPeerAddress )
        ) ) throw new Error( "invalid `IPeerSharingResponse`" );
    
        this.peerAddresses = peerAddresses;
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
            new CborUInt(1),
            new CborArray( this.peerAddresses.map( peer => peer.toCborObj() ) )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): PeerSharingResponse {
        const buff = cbor instanceof Uint8Array ? cbor: forceCborString( cbor ).toBuffer();
        return PeerSharingResponse.fromCborObj( Cbor.parse( buff ) );
    }
    static fromCborObj( cbor: CborObj ): PeerSharingResponse {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length === 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1) &&
            cbor.array[1] instanceof CborArray
        )) throw new Error("invalid CBOR for `PeerSharingResponse`");

        return new PeerSharingResponse({
            peerAddresses: cbor.array[1].array.map( peerAddressFromCborObj )
        });
    }
        
}
