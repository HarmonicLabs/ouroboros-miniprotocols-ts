import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborTag, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { hasOwn, isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";
import { DEFAULT_CARDANO_ERA } from "../../utils/defaultEra";

export interface ITxMonitorReplyNextTx {
    /** raw (unwrapped) tx cbor bytes; `undefined` when the mempool is exhausted */
    tx?: Uint8Array,
    /** era word of the era-wrapped tx (`tx = [era, #6.24(txBytes)]`); defaults to 6 (Conway) */
    era?: number | bigint
}

export function isITxMonitorReplyNextTx( stuff: any ): stuff is ITxMonitorReplyNextTx
{
    return isObject( stuff ) && (stuff.tx ? stuff.tx instanceof Uint8Array : true) && (
        stuff.era === undefined ||
        typeof stuff.era === "bigint" ||
        ( typeof stuff.era === "number" && Number.isSafeInteger( stuff.era ) && stuff.era >= 0 )
    );
}

export class TxMonitorReplyNextTx
    implements ToCbor, ToCborObj, ITxMonitorReplyNextTx
{
    readonly tx?: Uint8Array;
    readonly era: number;

    constructor(
        msg: ITxMonitorReplyNextTx,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        if(!isITxMonitorReplyNextTx( msg ))
        throw new Error("invalid interface for 'TxMonitorReplyNextTx'");

        this.tx = msg.tx;
        this.era = Number( msg.era ?? DEFAULT_CARDANO_ERA );
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
        const arr: CborObj[] = [ new CborUInt( 6 ) ];
        if( this.tx ) arr.push(
            new CborArray([
                new CborUInt( this.era ),
                new CborTag( 24, new CborBytes( this.tx ) )
            ])
        );
        return new CborArray( arr );
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorReplyNextTx
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor );
        return TxMonitorReplyNextTx.fromCborObj( Cbor.parse( bytes, { keepRef: true } ), bytes );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): TxMonitorReplyNextTx
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(6)
        )) throw new Error("invalid CBOR for 'TxMonitorReplyNextTx");

        const reply: ITxMonitorReplyNextTx = {
            tx: undefined,
            era: undefined
        };

        if( cbor.array[1] )
        {
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

                if( txBytes === undefined )
                throw new Error("invalid CBOR for 'TxMonitorReplyNextTx");

                reply.era = txData.array[0].num;
                reply.tx = txBytes;
            }
            // plain (unwrapped) tx bytes, kept for compatibility;
            // no cborRef so re-encoding produces the spec (era-wrapped) form
            else if( txData instanceof CborBytes )
            {
                return new TxMonitorReplyNextTx({ tx: txData.bytes });
            }
            else throw new Error("invalid CBOR for 'TxMonitorReplyNextTx");
        }

        return new TxMonitorReplyNextTx( reply, getSubCborRef( cbor, originalBytes ) );
    }
}