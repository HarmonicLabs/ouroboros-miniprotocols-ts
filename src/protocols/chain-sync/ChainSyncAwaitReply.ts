import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IChainSyncAwaitReply {};

export function isIChainSyncAwaitReply( stuff: any ): stuff is IChainSyncAwaitReply
{
    return isObject( stuff );
}

export class ChainSyncAwaitReply
    implements ToCbor, ToCborObj, IChainSyncAwaitReply
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(1) ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncAwaitReply
    {
        return ChainSyncAwaitReply.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): ChainSyncAwaitReply
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(1)
        )) throw new Error("invalid CBOR for 'ChainSyncAwaitReply");

        return new ChainSyncAwaitReply();
    }
}