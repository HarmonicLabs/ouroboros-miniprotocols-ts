import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { hasOwn, isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

export interface ITxMonitorReplyNextTx {
    tx?: Uint8Array
}

export function isITxMonitorReplyNextTx( stuff: any ): stuff is ITxMonitorReplyNextTx
{
    return isObject( stuff ) && (stuff.tx ? stuff.tx instanceof Uint8Array : true);
}

export class TxMonitorReplyNextTx
    implements ToCbor, ToCborObj, ITxMonitorReplyNextTx
{
    readonly tx?: Uint8Array;
    
    constructor(
        msg: ITxMonitorReplyNextTx,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { tx } = msg;
        if(!isITxMonitorReplyNextTx({ tx }))
        throw new Error("invalid interface for 'TxMonitorReplyNextTx'");

        this.tx = tx;
        this.cborRef = cborRef ?? subCborRefOrUndef( msg );
    };

    toCborBytes(): Uint8Array
    {
        if( this.cborRef instanceof SubCborRef ) return this.cborRef.toBuffer();
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        if( this.cborRef instanceof SubCborRef ) return new CborString( this.cborRef.toBuffer() );
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        if( this.cborRef instanceof SubCborRef ) return Cbor.parse( this.cborRef.toBuffer() ) as CborArray;
        const arr: CborObj[] = [ new CborUInt( 6 ) ];
        if( this.tx ) arr.push( new CborBytes( this.tx ) );
        return new CborArray( arr );
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorReplyNextTx
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
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
            tx: undefined
        };

        if( cbor.array[1] )
        {
            if(!( cbor.array[1] instanceof CborBytes ))
            throw new Error("invalid CBOR for 'TxMonitorReplyNextTx");

            reply.tx = cbor.array[1].bytes;
        }

        return new TxMonitorReplyNextTx( reply, getSubCborRef( cbor, originalBytes ) );
    }
}