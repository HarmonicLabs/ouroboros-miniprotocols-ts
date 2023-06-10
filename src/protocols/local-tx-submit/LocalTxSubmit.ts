import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ILocalTxSubmit {
    tx: Uint8Array
}

export function isILocalTxSubmit( stuff: any ): stuff is ILocalTxSubmit
{
    return isObject( stuff ) && isObject( stuff.tx ) && (stuff.tx instanceof Uint8Array);
}

export class LocalTxSubmit
    implements ToCbor, ToCborObj, ILocalTxSubmit
{
    readonly tx: Uint8Array;

    constructor({ tx }: ILocalTxSubmit)
    {
        if(!(tx instanceof Uint8Array))
        throw new Error("invalid interface for 'LocalTxSubmit'");

        Object.defineProperty(
            this, "tx", {
                value: tx,
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
        return new CborArray([
            new CborUInt(0),
            new CborBytes( this.tx )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): LocalTxSubmit
    {
        return LocalTxSubmit.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): LocalTxSubmit
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0) &&
            cbor.array[1] instanceof CborBytes
        )) throw new Error("invalid CBOR for 'LocalTxSubmit");

        return new LocalTxSubmit({
            tx: cbor.array[1].buffer
        });
    }
}