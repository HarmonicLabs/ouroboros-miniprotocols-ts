import { Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor } from "@harmoniclabs/cbor";
import { isWord16 } from "../../utils/isWord16";
import { isWord32 } from "../../utils/isWord32";
import { hasOwn } from "@harmoniclabs/obj-utils";

type RawIPv6 = [ number, number, number, number ];

export function isRawIPv6( stuff: any ): stuff is RawIPv6
{
    if(
        !Array.isArray( stuff ) &&
        stuff.length >= 4
    ) return false;

    return (
        isWord32( stuff[0] ) &&
        isWord32( stuff[1] ) &&
        isWord32( stuff[2] ) &&
        isWord32( stuff[3] )
    );
}

export interface IPeerAddressIPv6 {
    address: RawIPv6;
    flowInfo?: number | bigint;
    scopeId?: number | bigint;
    portNumber: number | bigint;
}

export function isIPeerAddressIPv6( peerAddress: any ): peerAddress is IPeerAddressIPv6
{
    return ( 
        isRawIPv6( peerAddress.address ) &&
        (
            hasOwn( peerAddress, "flowInfo" ) ?
            isWord32( peerAddress.flowInfo ) :
            (peerAddress as any).flowInfo === undefined
        ) &&
        (
            hasOwn( peerAddress, "scopeId" ) ?
            isWord32( peerAddress.scopeId ) :
            (peerAddress as any).scopeId === undefined
        ) &&
        isWord16( peerAddress.portNumber )
    );
}

export class PeerAddressIPv6
    implements IPeerAddressIPv6, ToCbor
{
    readonly address: RawIPv6;
    readonly flowInfo: number | undefined;
    readonly scopeId: number | undefined;
    readonly portNumber: number;

    constructor( newPeerAddress: IPeerAddressIPv6 ) {
        if(!( isIPeerAddressIPv6( newPeerAddress ) )) throw new Error( "invalid new `IPeerAddressIPv6` data provided" );

        Object.defineProperties(
            this, {
                address: {
                    value: newPeerAddress.address,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                portNumber: {
                    value: Number( newPeerAddress.portNumber ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                flowInfo: {
                    value: newPeerAddress.flowInfo ? Number( newPeerAddress.flowInfo ) : undefined,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                scopeId: {
                    value: newPeerAddress.scopeId ? Number( newPeerAddress.scopeId ) : undefined,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    isV13(): boolean
    {
        return (
            typeof this.flowInfo === "undefined" ||
            typeof this.scopeId === "undefined"
        );        
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        if( this.isV13() )
        {
            return new CborArray([
                new CborUInt( 1 ),
                new CborUInt( this.address[0] ),
                new CborUInt( this.address[1] ),
                new CborUInt( this.address[2] ),
                new CborUInt( this.address[3] ),
                new CborUInt( this.portNumber )
            ]);
        }

        return new CborArray([
            new CborUInt( 1 ),
            new CborUInt( this.address[0] ),
            new CborUInt( this.address[1] ),
            new CborUInt( this.address[2] ),
            new CborUInt( this.address[3] ),
            new CborUInt( this.flowInfo ?? 0 ),
            new CborUInt( this.scopeId ?? 0 ),
            new CborUInt( this.portNumber )
        ]);
    }

    static fromCborObj( cbor: CborObj ): PeerAddressIPv6 {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 6 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[2] instanceof CborUInt &&
            cbor.array[3] instanceof CborUInt &&
            cbor.array[4] instanceof CborUInt &&
            cbor.array[5] instanceof CborUInt
        )) throw new Error( "invalid CBOR for `PeerAddressIPv6`" );

        const isV12OrBelow = cbor.array.length >= 8;

        if(
            isV12OrBelow && !(
                cbor.array[6] instanceof CborUInt &&
                cbor.array[7] instanceof CborUInt
            )
        ) throw new Error( "invalid CBOR for `PeerAddressIPv6`" );

        return new PeerAddressIPv6({
            address: [
                Number( cbor.array[1].num ),
                Number( cbor.array[2].num ),
                Number( cbor.array[3].num ),
                Number( cbor.array[4].num )
            ],
            flowInfo: isV12OrBelow ? cbor.array[5].num : undefined,
            scopeId: isV12OrBelow ? (cbor.array[6] as CborUInt).num : undefined,
            portNumber: isV12OrBelow ? (cbor.array[7] as CborUInt).num : cbor.array[5].num
        });
    }

}