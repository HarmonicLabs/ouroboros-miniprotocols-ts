import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface ILocalTxSubmitSubmit {
    tx: Uint8Array
}

export function isILocalTxSubmitSubmit( stuff: any ): stuff is ILocalTxSubmitSubmit
{
    return isObject( stuff ) && isObject( stuff.tx ) && (stuff.tx instanceof Uint8Array);
}

export class LocalTxSubmitSubmit
    implements ToCbor, ToCborObj, ILocalTxSubmitSubmit
{
    readonly tx: Uint8Array;

    constructor({ tx }: ILocalTxSubmitSubmit)
    {
        if(!(tx instanceof Uint8Array))
        throw new Error("invalid interface for 'LocalTxSubmitSubmit'");

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

    static fromCbor( cbor: CanBeCborString ): LocalTxSubmitSubmit
    {
        return LocalTxSubmitSubmit.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): LocalTxSubmitSubmit
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0) &&
            cbor.array[1] instanceof CborBytes
        )) throw new Error("invalid CBOR for 'LocalTxSubmitSubmit");

        return new LocalTxSubmitSubmit({
            tx: cbor.array[1].buffer
        });
    }
}