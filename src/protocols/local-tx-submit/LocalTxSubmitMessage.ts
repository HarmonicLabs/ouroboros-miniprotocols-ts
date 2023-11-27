import { isObject } from "@harmoniclabs/obj-utils";
import { LocalTxSubmitAccept } from "./LocalTxSubmitAccept";
import { LocalTxSubmitDone } from "./LocalTxSubmitDone";
import { LocalTxSubmitReject } from "./LocalTxSubmitReject";
import { LocalTxSubmitSubmit } from "./LocalTxSubmitSubmit";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, forceCborString } from "@harmoniclabs/cbor";

export type LocalTxSubmitMessage
    = LocalTxSubmitSubmit
    | LocalTxSubmitReject
    | LocalTxSubmitAccept
    | LocalTxSubmitDone;

export function isLocalTxSubmitMessage( thing: any ): thing is LocalTxSubmitMessage
{
    return isObject( thing ) && (
        thing instanceof LocalTxSubmitSubmit ||
        thing instanceof LocalTxSubmitReject ||
        thing instanceof LocalTxSubmitAccept ||
        thing instanceof LocalTxSubmitDone
    );
}

export function LocalTxSubmitSubmitMessageFromCbor( cbor: CanBeCborString ): LocalTxSubmitMessage
{
    return localTxSubmitMessageFromCborObj(
        Cbor.parse(
            cbor instanceof Uint8Array ? cbor :
            forceCborString( cbor )
        )
    );
}
export function localTxSubmitMessageFromCborObj( cbor: CborObj ): LocalTxSubmitMessage
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid cbor for 'LocalTxSubmitMessage'");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return LocalTxSubmitSubmit.fromCborObj( cbor );
    if( idx === 1 ) return new LocalTxSubmitAccept();
    if( idx === 2 ) return LocalTxSubmitReject.fromCborObj( cbor );
    if( idx === 3 ) return new LocalTxSubmitDone();

    throw new Error("invalid cbor for 'LocalTxSubmitMessage'; unknown index: " + idx);
}