import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getCborBytesDescriptor } from "./utils/getCborBytesDescriptor";

export interface IChainSyncMessageDone {}

export function isIChainSyncMessageDone( stuff: any ): stuff is IChainSyncMessageDone
{
    return isObject( stuff );
}

export class ChainSyncMessageDone
    implements ToCbor, ToCborObj, IChainSyncMessageDone
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
        return new CborArray([ new CborUInt(7) ]);
    }

    static fromCbor( cbor: CanBeCborString ): ChainSyncMessageDone
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        const msg = ChainSyncMessageDone.fromCborObj( Cbor.parse( buff ) );
        
        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
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