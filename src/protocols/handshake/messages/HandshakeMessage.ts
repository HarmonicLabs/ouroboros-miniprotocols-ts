import { CborArray, CborObj, CborUInt } from "@harmoniclabs/cbor";
import { HandshakeAcceptVersion } from "./HandshakeAcceptVersion";
import { HandshakeQueryReply } from "./HandshakeQueryReply";
import { HandshakeRefuse } from "./HandshakeRefuse";
import { HandshakeProposeVersion } from "./HandshakeProposeVersion";

export type HandshakeMessage = HandshakeProposeVersion | HandshakeAcceptVersion | HandshakeRefuse | HandshakeQueryReply;

export function isHandshakeMessage( thing: any ): thing is HandshakeMessage
{
    return (
        thing instanceof HandshakeProposeVersion ||
        thing instanceof HandshakeAcceptVersion ||
        thing instanceof HandshakeRefuse ||
        thing instanceof HandshakeQueryReply
    );
}

export function handshakeMessageFromCborObj( cObj: CborObj ): HandshakeMessage
{
    if(!(
        cObj instanceof CborArray &&
        cObj.array.length >= 1 &&
        cObj.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for 'HandshakeMessage'");

    const idx = Number( cObj.array[0].num );

    if( idx === 0 ) return HandshakeProposeVersion.fromCborObj( cObj );
    if( idx === 1 ) return HandshakeAcceptVersion.fromCborObj( cObj );
    if( idx === 2 ) return HandshakeRefuse.fromCborObj( cObj );
    if( idx === 3 ) return HandshakeQueryReply.fromCborObj( cObj );

    throw new Error("invalid CBOR for 'HandshakeMessage'; invalid index");
}
