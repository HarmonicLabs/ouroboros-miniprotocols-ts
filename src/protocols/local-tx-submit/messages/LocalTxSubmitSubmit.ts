import { CanBeCborString, Cbor, CborArray, CborBytes, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

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

    constructor(
        msg: ILocalTxSubmitSubmit,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const tx = msg.tx;
        if(!(tx instanceof Uint8Array))
        throw new Error("invalid interface for 'LocalTxSubmitSubmit'");

        this.tx = tx;
        this.cborRef = cborRef ?? subCborRefOrUndef( msg );
    };

    toCborBytes(): Uint8Array
    {
        if( this.cborRef instanceof SubCborRef ) return this.cborRef.toBuffer();
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        if( this.cborRef instanceof SubCborRef ) return new CborString( this.cborRef.toBuffer() );
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        if( this.cborRef instanceof SubCborRef ) return Cbor.parse( this.cborRef.toBuffer() ) as CborArray;
        return new CborArray([
            new CborUInt(0),
            new CborBytes( this.tx )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): LocalTxSubmitSubmit
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
        return LocalTxSubmitSubmit.fromCborObj( Cbor.parse( bytes, { keepRef: true } ), bytes );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): LocalTxSubmitSubmit
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(0) &&
            cbor.array[1] instanceof CborBytes
        )) throw new Error("invalid CBOR for 'LocalTxSubmitSubmit");

        return new LocalTxSubmitSubmit({
            tx: cbor.array[1].bytes
        }, getSubCborRef( cbor, originalBytes ));
    }
}