import { isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, forceCborString } from "@harmoniclabs/cbor";
import { IKeepAliveDone, KeepAliveDone } from "./messages/KeepAliveDone";
import { IKeepAliveResponse, KeepAliveResponse } from "./messages/KeepAliveResponse";
import { IKeepAliveRequest, KeepAliveRequest } from "./messages/KeepAliveRequest";

export type KeepAliveMessage
    = KeepAliveRequest
    | KeepAliveResponse
    | KeepAliveDone

export function isKeepAliveMessage( stuff: any ): stuff is KeepAliveMessage
{
    return isObject( stuff ) && (
        stuff instanceof KeepAliveRequest ||
        stuff instanceof KeepAliveResponse ||
        stuff instanceof KeepAliveDone
    );
}

export type IKeepAliveMessage
    = IKeepAliveRequest // {}
    | IKeepAliveResponse // {}
    | IKeepAliveDone

export function isIKeepAliveMessage( stuff: any ): stuff is IKeepAliveMessage
{
    return isObject( stuff ); // empty object satisfies some of the KeepAlive messages
}

export function chainSyncMessageFromCbor( cbor: CanBeCborString ): KeepAliveMessage
{
    const buff = cbor instanceof Uint8Array ? 
        cbor : 
        forceCborString( cbor ).toBuffer();
    
    const msg = keepAliveMessageFromCborObj( Cbor.parse( buff ) );

    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
    msg.cborBytes = buff;

    return msg;
}
export function keepAliveMessageFromCborObj( cbor: CborObj ): KeepAliveMessage
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid cbor for 'KeepAliveMessage'");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return KeepAliveRequest.fromCborObj( cbor );
    if( idx === 1 ) return KeepAliveResponse.fromCborObj( cbor );
    if( idx === 2 ) return new KeepAliveDone();

    throw new Error("invalid cbor for 'KeepAliveMessage'; unknown index: " + idx);
}