import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

import { DEFAULT_CARDANO_ERA } from "../../utils/defaultEra";

/** era word used when none is specified (6 = Conway) */
export const DEFAULT_TX_SUBMIT_ERA = DEFAULT_CARDANO_ERA;

export interface ILocalTxSubmitSubmit {
    tx: Uint8Array,
    /** era word for the era-wrapped tx (`tx = [era, #6.24(txBytes)]`); defaults to 6 (Conway) */
    era?: number | bigint
}

export function isILocalTxSubmitSubmit( stuff: any ): stuff is ILocalTxSubmitSubmit
{
    return isObject( stuff ) && (stuff.tx instanceof Uint8Array) && (
        stuff.era === undefined ||
        typeof stuff.era === "bigint" ||
        ( typeof stuff.era === "number" && Number.isSafeInteger( stuff.era ) && stuff.era >= 0 )
    );
}

export class LocalTxSubmitSubmit
    implements ToCbor, ToCborObj, ILocalTxSubmitSubmit
{
    readonly tx: Uint8Array;
    readonly era: number;

    constructor(
        msg: ILocalTxSubmitSubmit,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        if( !isILocalTxSubmitSubmit( msg ) )
        throw new Error("invalid interface for 'LocalTxSubmitSubmit'");

        this.tx = msg.tx;
        this.era = Number( msg.era ?? DEFAULT_TX_SUBMIT_ERA );
        this.cborRef = cborRef ?? subCborRefOrUndef( msg );
    };

    toCborBytes(): Uint8Array
    {
        if( this.cborRef instanceof SubCborRef ) return this.cborRef.toBuffer();
        return this.toCbor();
    }
    toCbor(): CborString
    {
        if( this.cborRef instanceof SubCborRef ) return this.cborRef.toBuffer();
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        if( this.cborRef instanceof SubCborRef ) return Cbor.parse( this.cborRef.toBuffer() ) as CborArray;
        return new CborArray([
            new CborUInt(0),
            new CborArray([
                new CborUInt( this.era ),
                new CborTag( 24, new CborBytes( this.tx ) )
            ])
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): LocalTxSubmitSubmit
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor );
        return LocalTxSubmitSubmit.fromCborObj( Cbor.parse( bytes, { keepRef: true } ), bytes );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): LocalTxSubmitSubmit
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0)
        )) throw new Error("invalid CBOR for 'LocalTxSubmitSubmit");

        const txData = cbor.array[1];

        // spec form: tx = [era, #6.24(txBytes)]
        if(
            txData instanceof CborArray &&
            txData.array.length >= 2 &&
            txData.array[0] instanceof CborUInt
        )
        {
            const wrapped = txData.array[1];
            const txBytes =
                wrapped instanceof CborTag && wrapped.data instanceof CborBytes ? wrapped.data.bytes :
                wrapped instanceof CborBytes ? wrapped.bytes :
                undefined;

            if( txBytes !== undefined )
            return new LocalTxSubmitSubmit({
                tx: txBytes,
                era: txData.array[0].num
            }, getSubCborRef( cbor, originalBytes ));
        }

        // legacy flat form emitted by this library up to 0.0.5-dev8;
        // no cborRef so re-encoding produces the spec (era-wrapped) form
        if( txData instanceof CborBytes )
        return new LocalTxSubmitSubmit({
            tx: txData.bytes
        });

        throw new Error("invalid CBOR for 'LocalTxSubmitSubmit");
    }
}