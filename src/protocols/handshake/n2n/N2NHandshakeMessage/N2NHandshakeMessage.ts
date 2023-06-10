import { isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, forceCborString } from "@harmoniclabs/cbor";
import { N2NMessageAcceptVersion } from "./N2NMessageAcceptVersion";
import { N2NMessageRefuse } from "./N2NMessageRefuse";
import { N2NMessageProposeVersion } from "./N2NMessageProposeVersion";
import { N2NMessageQueryReply } from "./N2NMessageQueryReply";

export type N2NHandshakeMessage
    = N2NMessageProposeVersion
    | N2NMessageAcceptVersion
    | N2NMessageRefuse
    | N2NMessageQueryReply;

export function isN2NHandshakeMessage( stuff: any ): stuff is N2NHandshakeMessage
{
    return (
        isObject( stuff ) &&
        (
            stuff instanceof N2NMessageProposeVersion   ||
            stuff instanceof N2NMessageAcceptVersion    ||
            stuff instanceof N2NMessageRefuse           ||
            stuff instanceof N2NMessageQueryReply
        )
    );
}

export function n2nHandshakeMessageToCbor( n2nHandshakeMessage: N2NHandshakeMessage ): CborString
{
    return n2nHandshakeMessage.toCbor();
}
export function n2nHandshakeMessageToCborObj( n2nHandshakeMessage: N2NHandshakeMessage ): CborArray
{
    return n2nHandshakeMessage.toCborObj();
}

export function n2nHandshakeMessageFromCbor( cbor: CanBeCborString ): N2NHandshakeMessage
{
    return n2nHandshakeMessageFromCborObj( Cbor.parse( forceCborString( cbor ) ) );
}
export function n2nHandshakeMessageFromCborObj( cbor: CborObj ): N2NHandshakeMessage
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length > 0 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for N2NHandshakeMessage");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return N2NMessageProposeVersion.fromCborObj( cbor );
    if( idx === 1 ) return N2NMessageAcceptVersion.fromCborObj( cbor );
    if( idx === 2 ) return N2NMessageRefuse.fromCborObj( cbor );
    if( idx === 3 ) return N2NMessageQueryReply.fromCborObj( cbor );
    
    throw new Error("invalid CBOR for N2NHandshakeMessage; unknown reason index: " + idx)
}