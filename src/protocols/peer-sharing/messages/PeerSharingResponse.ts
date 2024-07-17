import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { getCborBytesDescriptor } from "../../utils/getCborBytesDescriptor";
import { PeerAddress, isValidPeerAddress, peerAddressFromCborObj } from "../PeerAddress/PeerAddress";

export interface IPeerSharingResponse {
    peerAddresses: PeerAddress[];
}

export class PeerSharingResponse implements ToCbor, ToCborObj, IPeerSharingResponse {
        
    readonly cborBytes?: Uint8Array | undefined;

    readonly peerAddresses: PeerAddress[];
    
    constructor( { peerAddresses } : IPeerSharingResponse ) {
        if( !(
            Array.isArray( peerAddresses ) &&
            peerAddresses.every( isValidPeerAddress )
        ) ) throw new Error( "invalid `IPeerSharingResponse`" );
    
        Object.defineProperties(
            this, {
                cborBytes: getCborBytesDescriptor(),
                peerAddresses: {
                    value: peerAddresses,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    toCborObj(): CborArray {
        return new CborArray([
            new CborUInt(1),
            new CborArray( this.peerAddresses.map( peer => peer.toCborObj() ) )
        ]);
    }

    toCbor(): CborString {
        return new CborString( this.toCborBytes() );
    }

    toCborBytes(): Uint8Array {
        if(!( this.cborBytes instanceof Uint8Array )) {
            // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.
            this.cborBytes = Cbor.encode( this.toCborObj() ).toBuffer();
        }

        return Uint8Array.prototype.slice.call( this.cborBytes );
    }

    static fromCbor( cbor: CanBeCborString ): PeerSharingResponse {
        const buff = cbor instanceof Uint8Array ? cbor: forceCborString( cbor ).toBuffer();
            
        const msg = PeerSharingResponse.fromCborObj( Cbor.parse( buff ) );
        
        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
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
