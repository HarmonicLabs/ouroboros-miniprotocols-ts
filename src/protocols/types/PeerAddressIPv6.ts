import { CborArray, CborObj, CborUInt } from "@harmoniclabs/cbor";
import { isWord16 } from "../utils/isWord16";
import { isWord32 } from "../utils/isWord32";

export interface IPeerAddressIPv6 {
    ipFlag: number | bigint;
    address: (number | bigint)[];
    flowInfo: number | bigint;
    scopeId: number | bigint;
    portNumber: number | bigint;
}

export function isIPv6( peerAddress : IPeerAddressIPv6 ): boolean {
    if( 
        peerAddress.ipFlag == 1 &&
        peerAddress.address.length == 4 &&
        isWord32( peerAddress.address[0] ) &&
        isWord32( peerAddress.address[1] ) &&
        isWord32( peerAddress.address[2] ) &&
        isWord32( peerAddress.address[3] ) &&
        isWord32( peerAddress.flowInfo ) &&
        isWord32( peerAddress.scopeId ) &&
        isWord16( peerAddress.portNumber )
    ) return true;

    return false;
}

export class PeerAddressIPv6 implements IPeerAddressIPv6 {

    readonly ipFlag: number | bigint;
    readonly address: (number | bigint)[];
    readonly flowInfo: number | bigint;
    readonly scopeId: number | bigint;
    readonly portNumber: number | bigint;

    constructor( newPeerAddress: IPeerAddressIPv6 ) {
        if(!( isIPv6( newPeerAddress ) )) throw new Error( "invalid new `IPeerAddressIPv6` data provided" );

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
                },
                flowInfo: {
                    value: newPeerAddress.portNumber,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                scopeId: {
                    value: newPeerAddress.portNumber,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    static addressToCborObj( peerAddress: PeerAddressIPv6 ): CborArray {
        if( !isIPv6( peerAddress ) ) throw new Error( "invalid `PeerAddressIPv6`" );

        return new CborArray([
            new CborUInt( peerAddress.ipFlag ),
            new CborUInt( peerAddress.address[0] ),
            new CborUInt( peerAddress.address[1] ),
            new CborUInt( peerAddress.address[2] ),
            new CborUInt( peerAddress.address[3] ),
            new CborUInt( peerAddress.flowInfo ),
            new CborUInt( peerAddress.scopeId ),
            new CborUInt( peerAddress.portNumber )
        ]);
    }

    static cborObjToAddress( cbor: CborObj ): PeerAddressIPv6 {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length == 8 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[2] instanceof CborUInt &&
            cbor.array[3] instanceof CborUInt &&
            cbor.array[4] instanceof CborUInt &&
            cbor.array[5] instanceof CborUInt &&
            cbor.array[6] instanceof CborUInt &&
            cbor.array[7] instanceof CborUInt
        )) throw new Error( "invalid CBOR for `PeerAddressIPv6`" );

        return new PeerAddressIPv6({
            ipFlag: cbor.array[0].num,
            address: [
                cbor.array[1].num,
                cbor.array[2].num,
                cbor.array[3].num,
                cbor.array[4].num
            ],
            flowInfo: cbor.array[5].num,
            scopeId: cbor.array[6].num,
            portNumber: cbor.array[7].num
        });
    }

}