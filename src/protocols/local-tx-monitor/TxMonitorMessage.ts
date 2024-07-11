import { isObject } from "@harmoniclabs/obj-utils";
import { TxMonitorAcquire, TxMonitorAwaitAquire } from "./messages/TxMonitorAcquire";
import { TxMonitorDone } from "./messages/TxMonitorDone";
import { TxMonitorGetSizes } from "./messages/TxMonitorGetSizes";
import { TxMonitorNextTx } from "./messages/TxMonitorNextTx";
import { TxMonitorRelease } from "./messages/TxMonitorRelease";
import { TxMonitorReplyGetSizes } from "./messages/TxMonitorReplyGetSizes";
import { TxMonitorReplyHasTx } from "./messages/TxMonitorReplyHasTx";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, cborObjFromRaw, forceCborString } from "@harmoniclabs/cbor";
import { TxMonitorAcquired, TxMonitorReplyNextTx, TxMonitorHasTx } from "./messages";

export type TxMonitorMessage
    = TxMonitorDone
    | TxMonitorAcquire
    | TxMonitorAcquired
    | TxMonitorRelease
    | TxMonitorNextTx
    | TxMonitorReplyNextTx
    | TxMonitorHasTx
    | TxMonitorReplyHasTx
    | TxMonitorGetSizes
    | TxMonitorReplyGetSizes;
    // | TxMonitorAwaitAquire // same as TxMonitorAcquire

export function isTxMonitorMessage( stuff: any ): stuff is TxMonitorMessage
{
    return isObject( stuff ) && (
        stuff instanceof TxMonitorDone          ||
        stuff instanceof TxMonitorAcquire       ||
        stuff instanceof TxMonitorAcquired      ||
        stuff instanceof TxMonitorRelease       ||
        stuff instanceof TxMonitorNextTx        ||
        stuff instanceof TxMonitorReplyNextTx   ||
        stuff instanceof TxMonitorHasTx         ||
        stuff instanceof TxMonitorReplyHasTx    ||
        stuff instanceof TxMonitorGetSizes      ||
        stuff instanceof TxMonitorReplyGetSizes
    );
}

export function txMonitorMessageFromCbor( cbor: CanBeCborString )
{
    return txMonitorMessageFromCborObj( Cbor.parse( forceCborString( cbor ) ) )
}
export function txMonitorMessageFromCborObj( cbor: CborObj )
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("Invalid CBOR for 'TxMonitorMessage'");

    const n = Number( cbor.array[0].num );

    if( n === 0  ) return new TxMonitorDone();
    if( n === 1  ) return new TxMonitorAcquire();
    if( n === 2  ) return TxMonitorAcquired.fromCborObj( cbor );
    if( n === 3  ) return new TxMonitorRelease();
    if( n === 4  ) throw new Error("unknown TxMonitorMessage with index 4");
    if( n === 5  ) return new TxMonitorNextTx();
    if( n === 6  ) return TxMonitorReplyNextTx.fromCborObj( cbor );
    if( n === 7  ) return TxMonitorHasTx.fromCborObj( cbor );
    if( n === 8  ) return TxMonitorReplyHasTx.fromCborObj( cbor );
    if( n === 9  ) return new TxMonitorGetSizes();
    if( n === 10 ) return TxMonitorReplyGetSizes.fromCborObj( cbor );
    
    throw new Error("unknown TxMonitorMessage with index " + n);
}