import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IChainSyncRequestNext{}

export function isIChainSyncRequestNext( stuff: any ): stuff is IChainSyncRequestNext
{
    return isObject( stuff );
}

export class ChainSyncRequestNext
    implements ToCbor, ToCborObj, IChainSyncRequestNext
{
    constructor() {};

    toJson() { return {}; }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(0) ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncRequestNext
    {
        return ChainSyncRequestNext.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): ChainSyncRequestNext
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0)
        )) throw new Error("invalid CBOR for 'ChainSyncRequestNext");

        return new ChainSyncRequestNext();
    }
}