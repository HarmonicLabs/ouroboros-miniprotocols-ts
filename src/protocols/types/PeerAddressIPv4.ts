import { CborArray, CborObj, CborUInt } from "@harmoniclabs/cbor";
import { isWord16 } from "../utils/isWord16";
import { isWord32 } from "../utils/isWord32";

export interface IPeerAddressIPv4 {
    ipFlag: number | bigint;
    address: (number | bigint)[];
    portNumber: number | bigint;
}

export function isIPv4( peerAddress : IPeerAddressIPv4 ): boolean {
    if( 
        peerAddress.ipFlag == 0 &&
        peerAddress.address.length == 1 &&
        isWord32( peerAddress.address[0] ) &&
        isWord16( peerAddress.portNumber )
    ) return true;
    
    return false;
}

export class PeerAddressIPv4 implements IPeerAddressIPv4 {

    readonly ipFlag: number | bigint;
    readonly address: (number | bigint)[];
    readonly portNumber: number | bigint;

    constructor( newPeerAddress: IPeerAddressIPv4 ) {
        if(!( isIPv4( newPeerAddress ) )) throw new Error( "invalid new `IPeerAddressIPv4` data provided" );

        Object.defineProperties(
            this, {
                ipFlag: {
                    value: newPeerAddress.ipFlag,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                address: {
                    value: newPeerAddress.address,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                portNumber: {
                    value: newPeerAddress.portNumber,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    static addressToCborObj( peerAddress: PeerAddressIPv4 ): CborArray {
        if( !isIPv4( peerAddress ) ) throw new Error( "invalid `PeerAddressIPv4`" );

        return new CborArray([
            new CborUInt( peerAddress.ipFlag ),
            new CborUInt( peerAddress.address[0] ),
            new CborUInt( peerAddress.portNumber )
        ]);
    }

    static cborObjToAddress( cbor: CborObj ): PeerAddressIPv4 {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length == 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[2] instanceof CborUInt
        )) throw new Error( "invalid CBOR for `PeerAddressIPv4`" );

        return new PeerAddressIPv4({
            ipFlag: cbor.array[0].num,
            address: [
                cbor.array[1].num,
            ],
            portNumber: cbor.array[2].num
        });
    }

}