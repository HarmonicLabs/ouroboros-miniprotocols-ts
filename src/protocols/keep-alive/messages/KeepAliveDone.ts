import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IKeepAliveDone {}

export function isIKeepAliveDone( stuff: any ): stuff is IKeepAliveDone
{
    return isObject( stuff );
}

export class KeepAliveDone
    implements ToCborString, ToCborObj, IKeepAliveDone
{
    constructor() {};

    toJSON() { return this.toJson(); }
    toJson() { return {}; }

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([ new CborUInt(2) ]);
    }

    static fromCbor( cbor: CanBeCborString ): KeepAliveDone
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return KeepAliveDone.fromCborObj( Cbor.parse( buff, { keepRef: false } ) );
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