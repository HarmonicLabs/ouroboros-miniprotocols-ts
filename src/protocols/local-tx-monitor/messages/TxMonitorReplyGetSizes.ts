import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, forceCborString, ToCbor } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils"

const roDescr = Object.freeze({
    writable: false,
    enumerable: true,
    configurable: false
});

export interface ITxMonitorReplyGetSizes
{
    mempoolCapacity: number,
    mempoolSize: number,
    nTxs: number
}

export function isITxMonitorReplyGetSizes( stuff: any ): stuff is ITxMonitorReplyGetSizes
{
    return isObject( stuff ) && (
        Number.isSafeInteger( stuff.mempoolCapacity ) &&
        Number.isSafeInteger( stuff.mempoolSize )     &&
        Number.isSafeInteger( stuff.nTxs )
    );
}

export class TxMonitorReplyGetSizes
    implements ITxMonitorReplyGetSizes, ToCbor
{
    readonly mempoolCapacity: number
    readonly mempoolSize: number
    readonly nTxs: number

    constructor( reply: ITxMonitorReplyGetSizes )
    {
        if( !isITxMonitorReplyGetSizes( reply ) ) throw new Error("invalid `ITxMonitorReplyGetSizes`");

        Object.defineProperties(
            this, {
                mempoolCapacity: {
                    value: reply.mempoolCapacity,
                    ...roDescr
                },
                mempoolSize: {
                    value: reply.mempoolSize,
                    ...roDescr
                },
                nTxs: {
                    value: reply.nTxs,
                    ...roDescr
                },
            }
        );
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt( 10 ),
            new CborArray([
                new CborUInt( this.mempoolCapacity ),
                new CborUInt( this.mempoolSize ),
                new CborUInt( this.nTxs )
            ])
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorReplyGetSizes
    {
        return TxMonitorReplyGetSizes.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorReplyGetSizes
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(10) &&
            cbor.array[1] instanceof CborArray &&
            cbor.array[1].array.length === 3 &&
            cbor.array[1].array.every( elem => elem instanceof CborUInt )
        )) throw new Error("invalid CBOR for 'TxMonitorReplyGetSizes'");

        const [ mempoolCapacity, mempoolSize, nTxs ] = cbor.array[1].array
            .map( elem => Number( (elem as CborUInt).num ));

        return new TxMonitorReplyGetSizes({
            mempoolCapacity,
            mempoolSize,
            nTxs
        });
    }
}