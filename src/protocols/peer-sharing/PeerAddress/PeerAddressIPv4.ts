import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, forceCborString, ToCbor, ToCborObj, ToCborString } from "@harmoniclabs/cbor";
import { isWord16 } from "../../utils/isWord16";
import { isWord32 } from "../../utils/isWord32";

export interface IPeerAddressIPv4 {
    address: number | bigint;
    portNumber: number | bigint;
}

export function isIPeerAddressIPv4( peerAddress: any ): peerAddress is IPeerAddressIPv4
{
    return ( 
        isWord32( peerAddress.address ) &&
        isWord16( peerAddress.portNumber )
    );
}

export class PeerAddressIPv4 implements IPeerAddressIPv4, ToCborString, ToCborObj
{
    readonly address: number;
    readonly portNumber: number | bigint;

    constructor( newPeerAddress: IPeerAddressIPv4 )
    {
        if(!( isIPeerAddressIPv4( newPeerAddress ) ))
            throw new Error( "invalid new `IPeerAddressIPv4` data provided" );

        this.address = Number( newPeerAddress.address ) >>> 0;
        this.portNumber = newPeerAddress.portNumber;
    }

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt( 0 ),
            new CborUInt( this.address ),
            new CborUInt( this.portNumber )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): PeerAddressIPv4
    {
        return PeerAddressIPv4.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): PeerAddressIPv4
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 3 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[2] instanceof CborUInt
        )) throw new Error( "invalid CBOR for `PeerAddressIPv4`" );

        return new PeerAddressIPv4({
            address: cbor.array[1].num,
            portNumber: cbor.array[2].num
        });
    }

}