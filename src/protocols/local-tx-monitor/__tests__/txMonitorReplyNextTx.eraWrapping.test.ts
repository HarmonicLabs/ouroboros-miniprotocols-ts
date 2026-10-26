import { Cbor, CborArray, CborBytes, CborTag, CborUInt } from "@harmoniclabs/cbor";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { TxMonitorReplyNextTx } from "../messages/TxMonitorReplyNextTx";
import { txMonitorMessageFromCborObj } from "../TxMonitorMessage";

const txBytes = new Uint8Array([ 0x84, 0xa3, 0x00, 0x81, 0x82, 0x58, 0x20 ]);

// spec: msgReplyNextTx = [6] / [6, [era, #6.24(txBytes)]]
function specReplyCbor( era: number ): CborArray
{
    return new CborArray([
        new CborUInt(6),
        new CborArray([
            new CborUInt( era ),
            new CborTag( 24, new CborBytes( txBytes ) )
        ])
    ]);
}

describe("TxMonitorReplyNextTx era wrapping", () => {

    test("empty mempool reply `[6]` still parses (tx undefined)", () => {
        const decoded = TxMonitorReplyNextTx.fromCborObj(
            new CborArray([ new CborUInt(6) ])
        );
        expect( decoded.tx ).toBeUndefined();
    });

    // exactly the node reply shape that used to throw and kill the connection
    test("parses era-wrapped reply from a real node", () => {
        const decoded = TxMonitorReplyNextTx.fromCborObj( specReplyCbor( 6 ) );
        expect( decoded.tx ).toBeDefined();
        expect( toHex( decoded.tx! ) ).toEqual( toHex( txBytes ) );
        expect( decoded.era ).toEqual( 6 );
    });

    test("parses wire bytes via fromCbor and replays them byte-exact", () => {
        const wire = Cbor.encode( specReplyCbor( 6 ) );
        const decoded = TxMonitorReplyNextTx.fromCbor( wire );
        expect( toHex( decoded.tx! ) ).toEqual( toHex( txBytes ) );
        expect( toHex( decoded.toCborBytes() ) ).toEqual( toHex( wire ) );
    });

    test("encodes era-wrapped (default era 6, Conway)", () => {
        const msg = new TxMonitorReplyNextTx({ tx: txBytes });
        expect( toHex( msg.toCborBytes() ) )
            .toEqual( toHex( Cbor.encode( specReplyCbor( 6 ) ) ) );
    });

    test("round-trips through the central dispatcher", () => {
        const decoded = txMonitorMessageFromCborObj(
            Cbor.parse( new TxMonitorReplyNextTx({ tx: txBytes, era: 5 }).toCborBytes() )
        ) as TxMonitorReplyNextTx;
        expect( decoded ).toBeInstanceOf( TxMonitorReplyNextTx );
        expect( toHex( decoded.tx! ) ).toEqual( toHex( txBytes ) );
        expect( decoded.era ).toEqual( 5 );
    });

    test("accepts wrapped form without tag 24", () => {
        const noTag = new CborArray([
            new CborUInt(6),
            new CborArray([ new CborUInt(6), new CborBytes( txBytes ) ])
        ]);
        const decoded = TxMonitorReplyNextTx.fromCborObj( noTag );
        expect( toHex( decoded.tx! ) ).toEqual( toHex( txBytes ) );
    });

    test("decodes legacy plain-bytes form and re-encodes era-wrapped", () => {
        const legacy = new CborArray([
            new CborUInt(6),
            new CborBytes( txBytes )
        ]);
        const decoded = TxMonitorReplyNextTx.fromCborObj( legacy );
        expect( toHex( decoded.tx! ) ).toEqual( toHex( txBytes ) );
        expect( toHex( decoded.toCborBytes() ) )
            .toEqual( toHex( Cbor.encode( specReplyCbor( 6 ) ) ) );
    });
});
