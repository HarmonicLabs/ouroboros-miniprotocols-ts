import { MiniProtocol } from "../../../MiniProtocol/MiniProtocol";
import { HandshakeProposeVersion } from "../messages/HandshakeProposeVersion";
import { HandshakeAcceptVersion } from "../messages/HandshakeAcceptVersion";
import { HandshakeRefuse } from "../messages/HandshakeRefuse";
import { VersionData } from "../HandshakeVersionTable/VersionData";
import {
    HandshakeServer,
    N2N_HANDSHAKE_VERSIONS,
    pickMutualVersion,
} from "../HandshakeServer";

function asBytes(cbor: any): Uint8Array {
    if (cbor instanceof Uint8Array) return cbor;
    if (cbor?.bytes instanceof Uint8Array) return cbor.bytes;
    if (typeof cbor?.toBuffer === "function") return cbor.toBuffer();
    if (cbor?.buffer instanceof ArrayBuffer) return new Uint8Array(cbor.buffer);
    throw new Error(`cannot extract CBOR bytes from ${Object.prototype.toString.call(cbor)} keys=${cbor && Object.keys(cbor)}`);
}

function fakeMux(isN2N = true) {
    const sent: Uint8Array[] = [];
    const listeners: Array<(chunk: Uint8Array) => void> = [];
    return {
        isN2N,
        sent,
        on(proto: number, cb: (chunk: Uint8Array) => void) {
            if (proto === MiniProtocol.Handshake) listeners.push(cb);
        },
        off() {
            listeners.length = 0;
        },
        send(bytes: Uint8Array) {
            sent.push(bytes instanceof Uint8Array ? bytes : asBytes(bytes));
        },
        emit(bytes: Uint8Array) {
            for (const cb of listeners) cb(bytes);
        },
    };
}

describe("HandshakeServer", () => {
    test("pickMutualVersion prefers the highest overlapping version", () => {
        expect(pickMutualVersion([10, 12, 14], N2N_HANDSHAKE_VERSIONS)).toBe(14);
        expect(pickMutualVersion([99], N2N_HANDSHAKE_VERSIONS)).toBeUndefined();
    });

    test("accepts a matching N2N propose at the highest mutual version", () => {
        const mux = fakeMux(true);
        const accepted: number[] = [];
        new HandshakeServer(mux as any, {
            networkMagic: 1,
            n2n: true,
            onAccepted: ({ versionNumber }) => accepted.push(versionNumber),
        });
        const propose = new HandshakeProposeVersion(
            {
                versionTable: {
                    12: new VersionData({ networkMagic: 1 }, { includePeerSharing: true, includeQuery: true }),
                    14: new VersionData({ networkMagic: 1 }, { includePeerSharing: true, includeQuery: true }),
                },
            },
            true,
        );
        mux.emit(asBytes(propose.toCbor()));
        expect(accepted).toEqual([14]);
        expect(mux.sent).toHaveLength(1);
        const msg = HandshakeAcceptVersion.fromCbor(mux.sent[0]!);
        expect(msg.versionNumber).toBe(14);
        expect(msg.versionData.networkMagic).toBe(1);
    });

    test("refuses when networkMagic does not match", () => {
        const mux = fakeMux(true);
        const reasons: string[] = [];
        new HandshakeServer(mux as any, {
            networkMagic: 1,
            n2n: true,
            onRefused: (reason) => reasons.push(reason),
        });
        const propose = new HandshakeProposeVersion(
            {
                versionTable: {
                    14: new VersionData({ networkMagic: 764824073 }, { includePeerSharing: true, includeQuery: true }),
                },
            },
            true,
        );
        mux.emit(asBytes(propose.toCbor()));
        expect(reasons[0]).toMatch(/networkMagic mismatch/);
        expect(HandshakeRefuse.fromCbor(mux.sent[0]!)).toBeInstanceOf(HandshakeRefuse);
    });
});
