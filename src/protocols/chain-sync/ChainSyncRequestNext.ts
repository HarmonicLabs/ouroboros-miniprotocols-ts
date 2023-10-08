import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getCborBytesDescriptor } from "./utils/getCborBytesDescriptor";

export interface IChainSyncRequestNext{}

export function isIChainSyncRequestNext( stuff: any ): stuff is IChainSyncRequestNext
{
    return isObject( stuff );
}

export class ChainSyncRequestNext
    implements ToCbor, ToCborObj, IChainSyncRequestNext
{
    readonly cborBytes?: Uint8Array | undefined;

    constructor()
    {
        Object.defineProperty(
            this, "cborBytes", getCborBytesDescriptor()
        );
    };

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
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();

        const msg = ChainSyncRequestNext.fromCborObj( Cbor.parse( buff ) );
        
        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
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