import { isObject } from "@harmoniclabs/obj-utils";
import { QryAcquire } from "./QryAcquire";
import { QryAcquired } from "./QryAcquired";
import { QryDone } from "./QryDone";
import { QryFailure } from "./QryFailure";
import { QryQuery } from "./QryQuery";
import { QryReAcquire } from "./QryReAcquire";
import { QryRelease } from "./QryRelease";
import { QryResult } from "./QryResult";
import { CborArray, CborObj, CborUInt } from "@harmoniclabs/cbor";

export type QryMessage
    = QryAcquire
    | QryFailure
    | QryAcquired
    | QryReAcquire
    | QryQuery
    | QryResult
    | QryRelease
    | QryDone

export function isQryMessage( msg: any ): msg is QryMessage
{
    return isObject( msg ) && (
        msg instanceof QryAcquire ||
        msg instanceof QryFailure ||
        msg instanceof QryAcquired ||
        msg instanceof QryReAcquire ||
        msg instanceof QryQuery ||
        msg instanceof QryResult ||
        msg instanceof QryRelease ||
        msg instanceof QryDone
    );
}

export function localStateQueryMessageFromCborObj( cbor: CborObj ): QryMessage
{
    /*
    msgAcquire = [0 , point ] / [ 8 ]; `[8]` is shortcut for tip
    msgAcquired = [ 1 ]
    msgFailure = [2 , failure ]
    msgQuery = [3 , query ]; see `query.cddl`
    msgResult = [4 , result ]
    msgRelease = [5]
    msgReAcquire = [6 , point ] / [ 9 ]; `[9]` is shortcut for tip
    lsqMsgDone = [7]
    */
    if(!(
        cbor instanceof CborArray &&
            cbor.array.length >= 1 &&
            cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid CBOR for `QryMessage`");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 || idx === 8 ) return QryAcquire.fromCborObj( cbor );
    if( idx === 1 ) return new QryAcquired();
    if( idx === 2 ) return QryFailure.fromCborObj( cbor );
    if( idx === 3 ) return QryQuery.fromCborObj( cbor );
    if( idx === 4 ) return QryResult.fromCborObj( cbor );
    if( idx === 5 ) return new QryRelease();
    if( idx === 6 || idx === 9 ) return QryReAcquire.fromCborObj( cbor );
    if( idx === 7 ) return new QryDone();

    throw new Error("invalid CBOR for `QryMessage`; unknown index: " + idx.toString());
}