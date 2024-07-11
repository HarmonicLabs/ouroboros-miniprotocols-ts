import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getCborBytesDescriptor } from "../../utils/getCborBytesDescriptor";

export interface IKeepAliveDone {}

export function isIKeepAliveDone( stuff: any ): stuff is IKeepAliveDone
{
    return isObject( stuff );
}

export class KeepAliveDone
    implements ToCbor, ToCborObj, IKeepAliveDone
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
        return new CborString( this.toCborBytes() );
    }
    toCborObj()
    {
        return new CborArray([ new CborUInt(2) ]);
    }
    toCborBytes(): Uint8Array
    {
        if(!( this.cborBytes instanceof Uint8Array ))
        {
            // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.
            this.cborBytes = Cbor.encode( this.toCborObj() ).toBuffer();
        }

        return Uint8Array.prototype.slice.call( this.cborBytes );
    }

    static fromCbor( cbor: CanBeCborString ): KeepAliveDone
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        const msg = KeepAliveDone.fromCborObj( Cbor.parse( buff ) );
        
        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
    }
    static fromCborObj( cbor: CborObj ): KeepAliveDone
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2)
        )) throw new Error("invalid CBOR for 'KeepAliveDone");

        return new KeepAliveDone();
    }
}