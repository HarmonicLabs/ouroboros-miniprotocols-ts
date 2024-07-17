import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { hasOwn, isObject } from "@harmoniclabs/obj-utils";

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
    
    constructor({ tx }: ITxMonitorReplyNextTx )
    {
        if(!isITxMonitorReplyNextTx({ tx }))
        throw new Error("invalid interface for 'TxMonitorReplyNextTx'");

        Object.defineProperty(
            this, "tx", {
                value: tx ?? undefined,
                writable: false,
                enumerable: true,
                configurable: false
            }
        );
    };

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        const arr: CborObj[] = [ new CborUInt( 6 ) ];
        if( this.tx ) arr.push( new CborBytes( this.tx ) );
        return new CborArray( arr );
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorReplyNextTx
    {
        return TxMonitorReplyNextTx.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorReplyNextTx
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

            reply.tx = cbor.array[1].buffer;
        }

        return new TxMonitorReplyNextTx( reply );
    }
}