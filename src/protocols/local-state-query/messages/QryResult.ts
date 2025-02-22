import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef } from "../../utils/getSubCborRef";

export interface IQryResult {
    /**
     * not fixed in the specification;
     * 
     * check `query.cddl` for valid cardano queries' results
    **/
    result: CborObj
}

export class QryResult
    implements ToCbor, ToCborObj, IQryResult
{
    readonly result: CborObj;

    constructor(
        qry: IQryResult,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { result } = qry;
        if(!(
            isCborObj( result )
        )) throw new Error("invalid IQryResult interface");

        this.result = result;
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
            new CborUInt( 4 ),
            this.result
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryResult
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
        return QryResult.fromCborObj( Cbor.parse( bytes, { keepRef: true } ), bytes );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): QryResult
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt( 4 )
        )) throw new Error("invalid CBOR for 'QryResult");

        const [ _idx, _resultCbor ] = cbor.array;

        return new QryResult({
            result: cbor.array[1]
        }, getSubCborRef( cbor, originalBytes ));
    }
}