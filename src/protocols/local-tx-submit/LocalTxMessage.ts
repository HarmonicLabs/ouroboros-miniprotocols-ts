import { isObject } from "@harmoniclabs/obj-utils";
import { LocalTxAccept } from "./LocalTxAccept";
import { LocalTxDone } from "./LocalTxDone";
import { LocalTxReject } from "./LocalTxReject";
import { LocalTxSubmit } from "./LocalTxSubmit";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, forceCborString } from "@harmoniclabs/cbor";

export type LocalTxMessage
    = LocalTxSubmit
    | LocalTxReject
    | LocalTxAccept
    | LocalTxDone;

export function isLocalTxMessage( thing: any ): thing is LocalTxMessage
{
    return isObject( thing ) && (
        thing instanceof LocalTxSubmit ||
        thing instanceof LocalTxReject ||
        thing instanceof LocalTxAccept ||
        thing instanceof LocalTxDone
    );
}

export function localTxSubmitMessageFromCbor( cbor: CanBeCborString ): LocalTxMessage
{
    return localTxSubmitMessageFromCborObj(
        Cbor.parse(
            cbor instanceof Uint8Array ? cbor :
            forceCborString( cbor )
        )
    );
}
export function localTxSubmitMessageFromCborObj( cbor: CborObj ): LocalTxMessage
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid cbor for 'LocalTxMessage'");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return LocalTxSubmit.fromCborObj( cbor );
    if( idx === 1 ) return new LocalTxAccept();
    if( idx === 2 ) return LocalTxReject.fromCborObj( cbor );
    if( idx === 3 ) return new LocalTxDone();

    throw new Error("invalid cbor for 'LocalTxMessage'; unknown index: " + idx);
}