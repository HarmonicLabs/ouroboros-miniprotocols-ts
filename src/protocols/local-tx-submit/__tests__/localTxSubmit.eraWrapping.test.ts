import { Cbor, CborArray, CborBytes, CborTag, CborUInt } from "@harmoniclabs/cbor";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { LocalTxSubmitSubmit } from "../messages/LocalTxSubmitSubmit";
import { localTxSubmitMessageFromCborObj } from "../LocalTxSubmitMessage";

const txBytes = new Uint8Array([ 0x84, 0xa3, 0x00, 0x81, 0x82, 0x58, 0x20 ]);

// spec: msgSubmitTx = [0, tx]; tx = [era, #6.24(txBytes)]
function specSubmitCbor( era: number ): CborArray
{
    return new CborArray([
        new CborUInt(0),
        new CborArray([
            new CborUInt( era ),
            new CborTag( 24, new CborBytes( txBytes ) )
        ])
    ]);
}

describe("LocalTxSubmit MsgSubmitTx era wrapping", () => {

    test("encodes era-wrapped tx (default era 6, Conway)", () => {
        const msg = new LocalTxSubmitSubmit({ tx: txBytes });
        expect( msg.era ).toEqual( 6 );
        expect( toHex( msg.toCborBytes() ) )
            .toEqual( toHex( Cbor.encode( specSubmitCbor( 6 ) ) ) );
    });

    test("respects explicit era", () => {
        const msg = new LocalTxSubmitSubmit({ tx: txBytes, era: 5 });
        expect( toHex( msg.toCborBytes() ) )
            .toEqual( toHex( Cbor.encode( specSubmitCbor( 5 ) ) ) );
    });

    test("round-trips through the central dispatcher", () => {
        const original = new LocalTxSubmitSubmit({ tx: txBytes });
        const decoded = localTxSubmitMessageFromCborObj(
            Cbor.parse( original.toCborBytes() )
        );
        expect( decoded ).toBeInstanceOf( LocalTxSubmitSubmit );
        expect( toHex( ( decoded as LocalTxSubmitSubmit ).tx ) ).toEqual( toHex( txBytes ) );
        expect( ( decoded as LocalTxSubmitSubmit ).era ).toEqual( 6 );
    });

    test("accepts spec form without tag 24", () => {
        const noTag = new CborArray([
            new CborUInt(0),
            new CborArray([ new CborUInt(6), new CborBytes( txBytes ) ])
        ]);
        const decoded = LocalTxSubmitSubmit.fromCborObj( noTag );
        expect( toHex( decoded.tx ) ).toEqual( toHex( txBytes ) );
    });

    test("decodes legacy flat form and re-encodes era-wrapped", () => {
        const legacy = new CborArray([
            new CborUInt(0),
            new CborBytes( txBytes )
        ]);
        const decoded = LocalTxSubmitSubmit.fromCborObj( legacy );
        expect( toHex( decoded.tx ) ).toEqual( toHex( txBytes ) );
        // re-encoding must NOT replay the (protocol-violating) legacy bytes
        expect( toHex( decoded.toCborBytes() ) )
            .toEqual( toHex( Cbor.encode( specSubmitCbor( 6 ) ) ) );
    });
});
