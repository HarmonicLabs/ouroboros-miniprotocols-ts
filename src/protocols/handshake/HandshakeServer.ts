import { Cbor, type CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol/MiniProtocol";
import { Multiplexer } from "../../multiplexer";
import { VersionData } from "./HandshakeVersionTable/VersionData";
import type { VersionNumber } from "./HandshakeVersionTable/VersionNumber";
import { HandshakeAcceptVersion } from "./messages/HandshakeAcceptVersion";
import { HandshakeProposeVersion } from "./messages/HandshakeProposeVersion";
import { HandshakeRefuse } from "./messages/HandshakeRefuse";
import { RefuseReasonVersionMismatch } from "./messages/RefuseReason/RefuseReasonVersionMismatch";

/** Node-to-node versions HandshakeClient proposes by default. */
export const N2N_HANDSHAKE_VERSIONS: readonly VersionNumber[] = [7, 8, 9, 10, 11, 12, 13, 14];
/** Node-to-client versions HandshakeClient proposes by default. */
export const N2C_HANDSHAKE_VERSIONS: readonly VersionNumber[] = [16, 17, 18, 19];

const handshakeHeader = Object.freeze({
    hasAgency: true,
    protocol: MiniProtocol.Handshake,
});

function asCborBytes(cbor: unknown): Uint8Array {
    if (cbor instanceof Uint8Array) return cbor;
    const anyCbor = cbor as { bytes?: Uint8Array; toBuffer?: () => Uint8Array; buffer?: ArrayBufferLike };
    if (anyCbor?.bytes instanceof Uint8Array) return anyCbor.bytes;
    if (typeof anyCbor?.toBuffer === "function") return anyCbor.toBuffer();
    if (anyCbor?.buffer) return new Uint8Array(anyCbor.buffer);
    throw new Error("HandshakeServer: cannot extract CBOR bytes");
}

export function pickMutualVersion(
    offered: readonly number[],
    supported: readonly number[],
): VersionNumber | undefined {
    const mutual = offered.filter((v) => supported.includes(v));
    if (mutual.length === 0) return undefined;
    return Math.max(...mutual) as VersionNumber;
}

export interface HandshakeServerOptions {
    networkMagic: number;
    /** Default: multiplexer.isN2N. */
    n2n?: boolean;
    supportedVersions?: readonly VersionNumber[];
    onAccepted?: (info: { versionNumber: VersionNumber; versionData: VersionData }) => void;
    onRefused?: (reason: string) => void;
}

/**
 * Handshake *server* (library previously only shipped HandshakeClient).
 * N2N: parse Propose with n2n=true, pick max mutual version, Accept or Refuse.
 */
export class HandshakeServer {
    readonly mplexer: Multiplexer;
    readonly networkMagic: number;
    readonly isN2N: boolean;
    readonly supportedVersions: readonly VersionNumber[];

    private done = false;
    private prevBytes: Uint8Array | undefined;
    private readonly onAccepted?: HandshakeServerOptions["onAccepted"];
    private readonly onRefused?: HandshakeServerOptions["onRefused"];
    private readonly listener: (chunk: Uint8Array) => void;

    constructor(mplexer: Multiplexer, opts: HandshakeServerOptions) {
        this.mplexer = mplexer;
        this.networkMagic = opts.networkMagic;
        this.isN2N = opts.n2n ?? mplexer.isN2N;
        this.supportedVersions = opts.supportedVersions ?? (this.isN2N ? N2N_HANDSHAKE_VERSIONS : N2C_HANDSHAKE_VERSIONS);
        this.onAccepted = opts.onAccepted;
        this.onRefused = opts.onRefused;
        this.listener = (chunk: Uint8Array) => this.onHandshakeChunk(chunk);
        this.mplexer.on(MiniProtocol.Handshake, this.listener);
    }

    terminate(): void {
        try {
            this.mplexer.off(MiniProtocol.Handshake, this.listener);
        } catch {
            /* ignore */
        }
    }

    private onHandshakeChunk(chunk: Uint8Array): void {
        if (this.done) return;
        let data = chunk;
        if (this.prevBytes) {
            const tmp = new Uint8Array(this.prevBytes.length + chunk.length);
            tmp.set(this.prevBytes, 0);
            tmp.set(chunk, this.prevBytes.length);
            data = tmp;
            this.prevBytes = undefined;
        }
        while (data.length > 0) {
            let parsed: CborObj;
            let offset: number;
            try {
                const thing = Cbor.parseWithOffset(data);
                parsed = thing.parsed;
                offset = thing.offset;
            } catch {
                this.prevBytes = Uint8Array.prototype.slice.call(data);
                return;
            }
            try {
                const propose = HandshakeProposeVersion.fromCborObj(parsed, this.isN2N);
                this.handlePropose(propose);
            } catch {
                this.refuse("decode error");
                return;
            }
            if (offset >= data.length) break;
            data = data.subarray(offset);
        }
    }

    private handlePropose(propose: HandshakeProposeVersion): void {
        if (this.done) return;
        const offered = Object.keys(propose.versionTable).map((k) => Number(k)).filter((n) => Number.isFinite(n));
        const chosen = pickMutualVersion(offered, this.supportedVersions);
        if (chosen === undefined) {
            this.refuse("no mutual version");
            return;
        }
        const clientData = propose.versionTable[chosen];
        const clientMagic = clientData?.networkMagic;
        if (typeof clientMagic === "number" && clientMagic !== this.networkMagic) {
            this.refuse(`networkMagic mismatch (client ${clientMagic}, server ${this.networkMagic})`);
            return;
        }
        const versionData = new VersionData(
            {
                networkMagic: this.networkMagic,
                initiatorOnlyDiffusionMode: false,
                peerSharing: this.isN2N ? (clientData?.peerSharing ?? true) : false,
                query: clientData?.query ?? false,
            },
            {
                includePeerSharing: this.isN2N,
                includeQuery: true,
            },
        );
        const accept = new HandshakeAcceptVersion(
            { versionNumber: chosen, versionData },
            this.isN2N,
        );
        this.mplexer.send(asCborBytes(accept.toCbor()), handshakeHeader);
        this.done = true;
        this.onAccepted?.({ versionNumber: chosen, versionData });
    }

    private refuse(reason: string): void {
        if (this.done) return;
        const refuse = new HandshakeRefuse(
            { reason: new RefuseReasonVersionMismatch([...this.supportedVersions], this.isN2N) },
            this.isN2N,
        );
        this.mplexer.send(asCborBytes(refuse.toCbor()), handshakeHeader);
        this.done = true;
        this.onRefused?.(reason);
    }
}
