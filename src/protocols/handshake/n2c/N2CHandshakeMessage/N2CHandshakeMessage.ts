import { isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, forceCborString } from "@harmoniclabs/cbor";
import { N2CMessageAcceptVersion } from "./N2CMessageAcceptVersion";
import { N2CMessageRefuse } from "./N2CMessageRefuse";
import { N2CMessageProposeVersion } from "./N2CMessageProposeVersion";
import { N2CMessageQueryReply } from "./N2CMessageQueryReply";

export type N2CHandshakeMessage
    = N2CMessageProposeVersion
    | N2CMessageAcceptVersion
    | N2CMessageRefuse
    | N2CMessageQueryReply;

export function isN2CHandshakeMessage( stuff: any ): stuff is N2CHandshakeMessage
{
    return (
        isObject( stuff ) &&
        (
            stuff instanceof N2CMessageProposeVersion   ||
            stuff instanceof N2CMessageAcceptVersion    ||
            stuff instanceof N2CMessageRefuse           ||
            stuff instanceof N2CMessageQueryReply
        )
    );
}

export function n2cHandshakeMessageToCbor( n2cHandshakeMessage: N2CHandshakeMessage ): CborString
{
    return n2cHandshakeMessage.toCbor();
}
export function n2cHandshakeMessageToCborObj( n2cHandshakeMessage: N2CHandshakeMessage ): CborArray
{
    return n2cHandshakeMessage.toCborObj();
}

export function n2cHandshakeMessageFromCbor( cbor: CanBeCborString ): N2CHandshakeMessage
{
    return n2cHandshakeMessageFromCborObj( Cbor.parse( forceCborString( cbor ) ) );
}
export function n2cHandshakeMessageFromCborObj( cbor: CborObj ): N2CHandshakeMessage
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length > 0 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for N2CHandshakeMessage");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return N2CMessageProposeVersion.fromCborObj( cbor );
    if( idx === 1 ) return N2CMessageAcceptVersion.fromCborObj( cbor );
    if( idx === 2 ) return N2CMessageRefuse.fromCborObj( cbor );
    if( idx === 3 ) return N2CMessageQueryReply.fromCborObj( cbor );
    
    throw new Error("invalid CBOR for N2CHandshakeMessage; unknown reason index: " + idx)
}