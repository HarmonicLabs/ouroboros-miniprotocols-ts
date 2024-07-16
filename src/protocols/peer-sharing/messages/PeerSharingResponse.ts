import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getCborBytesDescriptor } from "../../utils/getCborBytesDescriptor";
import { isWord16 } from "../../utils/isWord16";
import { isWord32 } from "../../utils/isWord32";

export interface IPeerSharingResponse {
    peerAddresses: IPeerAddress[];
}

export interface IPeerAddress {
    readonly ipFlag: number | bigint;
    readonly address: (number | bigint)[];
    readonly flowInfo?: number | bigint | undefined;
    readonly scopeId?: number | bigint | undefined;
    readonly portNumber: number | bigint;
}

export function isValidAddress( peerAddress: IPeerAddress ): boolean {

    if( peerAddress.ipFlag < 0 || peerAddress.ipFlag > 1 ) return false;
    
    if( 
        peerAddress.ipFlag == 0 &&
        peerAddress.address.length == 1 &&
        isWord32( peerAddress.address[0] ) &&
        isWord16( peerAddress.portNumber )
    ) return true;
    
    if( 
        peerAddress.ipFlag == 1 &&
        peerAddress.address.length == 4 &&
        peerAddress.flowInfo &&
        peerAddress.scopeId &&
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

export function areValidPeerAddresses( peerAddresses: IPeerAddress[] ): boolean {
    
    peerAddresses.map(( peerAddress: IPeerAddress ) => {
        if( !isValidAddress( peerAddress ) ) return false;
    })
    
    return true;

}

export function interfaceToCborObj( peerAddress: IPeerAddress ): CborArray {
    
    if(!(
        peerAddress.ipFlag >= 0 &&
        peerAddress.ipFlag <= 1
    )) throw new Error("invalid IPeerAddress");

    if( peerAddress.ipFlag == 0 ) {

        return new CborArray([
            new CborUInt( peerAddress.ipFlag ),
            new CborUInt( peerAddress.address[0] ),
            new CborUInt( peerAddress.portNumber )
        ]);

    } else if(
        peerAddress.ipFlag == 1 && 
        peerAddress.flowInfo && 
        peerAddress.scopeId 
    ) {

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

    return new CborArray([]);

}

export function cborToInterface( cbor: CborObj ): IPeerAddress {
    
    if(!(
        cbor instanceof CborArray &&
        cbor.array[0] instanceof CborUInt &&
        cbor.array[0].num >= 0 &&
        cbor.array[0].num <= 1
    )) throw new Error("invalid CBOR for 'IPeerAddress'");

    if(
        cbor.array[0].num == BigInt(0) &&
        cbor.array.length == 3 &&
        cbor.array[1] instanceof CborUInt &&
        cbor.array[2] instanceof CborUInt
    ) {

        return {
            ipFlag: cbor.array[0].num,
            address: [
                cbor.array[1].num,
            ],
            portNumber: cbor.array[2].num
        };

    } else if( 
        cbor.array[0].num == BigInt(1) &&
        cbor.array.length == 8 &&
        cbor.array[1] instanceof CborUInt &&
        cbor.array[2] instanceof CborUInt &&
        cbor.array[3] instanceof CborUInt &&
        cbor.array[4] instanceof CborUInt &&
        cbor.array[5] instanceof CborUInt &&
        cbor.array[6] instanceof CborUInt &&
        cbor.array[7] instanceof CborUInt
    ) {

        return {
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
        };

    }

    return {
        ipFlag: 2,
        address: [],
        portNumber: -1
    };

}

export class PeerSharingResponse implements ToCbor, ToCborObj, IPeerSharingResponse {
        
    readonly cborBytes?: Uint8Array | undefined;

    readonly peerAddresses: IPeerAddress[];
    
    constructor( { peerAddresses } : IPeerSharingResponse ) {
        
        if( !(
            Array.isArray( peerAddresses ) &&
            areValidPeerAddresses( peerAddresses )
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
        )

    }

    toCborObj(): CborArray {
        return new CborArray([
            new CborUInt(1),
            new CborArray( this.peerAddresses.map( interfaceToCborObj ) )
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
            cbor.array.length == 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1) &&
            cbor.array[1] instanceof CborArray
        )) throw new Error("invalid CBOR for 'PeerSharingResponse");

        return new PeerSharingResponse({
            peerAddresses: cbor.array[1].array.map( cborToInterface )
        });

    }
        
}
