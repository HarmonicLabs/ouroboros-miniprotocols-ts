import { isObject } from "@harmoniclabs/obj-utils";
import { TxSubmitDone, ITxSubmitDone } from "./messages/TxSubmitDone";
import { TxSubmitInit, ITxSubmitInit } from "./messages/TxSubmitInit";
import { TxSubmitReplyIds, ITxSubmitReplyIds } from "./messages/TxSubmitReplyIds";
import { TxSubmitReplyTx, ITxSubmitReplyTx } from "./messages/TxSubmitReplyTx";
import { TxSubmitRequestIds, ITxSubmitRequestIds } from "./messages/TxSubmitRequestIds";
import { TxSubmitRequestTxs, ITxSubmitRequestTxs } from "./messages/TxSubmitRequestTxs";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, forceCborString } from "@harmoniclabs/cbor";

export type TxSubmitMessage 
    = TxSubmitInit
    | TxSubmitRequestIds
    | TxSubmitReplyIds 
    | TxSubmitRequestTxs
    | TxSubmitReplyTx
    | TxSubmitDone;

export type ITxSubmitMessage 
    = ITxSubmitInit
    | ITxSubmitRequestIds
    | ITxSubmitReplyIds 
    | ITxSubmitRequestTxs
    | ITxSubmitReplyTx
    | ITxSubmitDone;

export function isLocalTxSubmitMessage( stuff: any ): stuff is TxSubmitMessage {
    return isObject( stuff ) && (
        stuff instanceof TxSubmitInit       ||
        stuff instanceof TxSubmitRequestIds ||
        stuff instanceof TxSubmitReplyIds   ||
        stuff instanceof TxSubmitRequestTxs ||
        stuff instanceof TxSubmitReplyTx    ||
        stuff instanceof TxSubmitDone
    );
}

export function txSubmitSubmitMessageFromCbor( cbor: CanBeCborString ): TxSubmitMessage {
    const buff = cbor instanceof Uint8Array ? 
        cbor : 
        forceCborString( cbor ).toBuffer();
    
    const msg = txSubmitMessageFromCborObj( Cbor.parse( buff ) );

    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
    msg.cborBytes = buff;

    return msg;
}

export function txSubmitMessageFromCborObj( cbor: CborObj ): TxSubmitMessage {
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for `TxSubmitMessage`");

    const idx = Number( cbor.array[0].num );

    if( idx === 6 ) return TxSubmitInit.fromCborObj( cbor );
    if( idx === 0 ) return TxSubmitRequestIds.fromCborObj( cbor );
    if( idx === 1 ) return TxSubmitReplyIds.fromCborObj( cbor );
    if( idx === 2 ) return TxSubmitRequestTxs.fromCborObj( cbor );
    if( idx === 3 ) return TxSubmitReplyTx.fromCborObj( cbor );
    if( idx === 4 ) return TxSubmitDone.fromCborObj( cbor );

    throw new Error("invalid CBOR for `TxSubmitMessage`; unknown index: " + idx);
}