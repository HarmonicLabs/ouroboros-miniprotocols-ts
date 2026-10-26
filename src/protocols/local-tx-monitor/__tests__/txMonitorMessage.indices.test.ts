import { CborArray, CborUInt } from "@harmoniclabs/cbor";
import { txMonitorMessageFromCborObj } from "../TxMonitorMessage";
import {
    TxMonitorDone,
    TxMonitorAcquire,
    TxMonitorAcquired,
    TxMonitorRelease,
    TxMonitorNextTx,
    TxMonitorReplyNextTx,
    TxMonitorHasTx,
    TxMonitorReplyHasTx,
    TxMonitorGetSizes,
    TxMonitorReplyGetSizes
} from "../messages";

// spec indices from ouroboros-network `localTxMonitor` (node-to-client protocol 9)
const specMsgs: [ index: number, msg: any ][] = [
    [ 0 , new TxMonitorDone() ],
    [ 1 , new TxMonitorAcquire() ],
    [ 2 , new TxMonitorAcquired({ slotNumber: 123 }) ],
    [ 3 , new TxMonitorRelease() ],
    [ 5 , new TxMonitorNextTx() ],
    [ 6 , new TxMonitorReplyNextTx({ tx: new Uint8Array([ 0xde, 0xad ]) }) ],
    [ 7 , new TxMonitorHasTx({ txId: new Uint8Array( 32 ) }) ],
    [ 8 , new TxMonitorReplyHasTx({ hasTx: true }) ],
    [ 9 , new TxMonitorGetSizes() ],
    [ 10, new TxMonitorReplyGetSizes({ mempoolCapacity: 178176, mempoolSize: 0, nTxs: 0 }) ],
];

describe("localTxMonitor message indices", () => {

    test.each( specMsgs )("index %i encodes correctly", ( index, msg ) => {
        const cbor = msg.toCborObj() as CborArray;
        expect( cbor ).toBeInstanceOf( CborArray );
        expect( cbor.array[0] ).toBeInstanceOf( CborUInt );
        expect( ( cbor.array[0] as CborUInt ).num ).toEqual( BigInt( index ) );
    });

    // this is the check that would have caught `acquire()` sending MsgRelease
    test.each( specMsgs )("index %i round-trips to the same class", ( _index, msg ) => {
        const decoded = txMonitorMessageFromCborObj( msg.toCborObj() );
        expect( decoded ).toBeInstanceOf( msg.constructor );
    });

    test("spec bytes decode via per-class fromCbor", () => {
        expect( () => TxMonitorAcquire.fromCbor("8101") ).not.toThrow();
        expect( () => TxMonitorGetSizes.fromCbor("8109") ).not.toThrow();
        expect( () => TxMonitorRelease.fromCbor("8103") ).not.toThrow();
    });
});
