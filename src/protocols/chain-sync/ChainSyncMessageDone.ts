import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IChainSyncMessageDone {}

export function isIChainSyncMessageDone( stuff: any ): stuff is IChainSyncMessageDone
{
    return isObject( stuff );
}

export class ChainSyncMessageDone
    implements ToCbor, ToCborObj, IChainSyncMessageDone
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(7) ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncMessageDone
    {
        return ChainSyncMessageDone.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): ChainSyncMessageDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(7)
        )) throw new Error("invalid CBOR for 'ChainSyncMessageDone");

        return new ChainSyncMessageDone();
    }
}