import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

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

    constructor({ result }: IQryResult)
    {
        if(!(
            isCborObj( result )
        )) throw new Error("invalid IQryResult interface");

        Object.defineProperties(
            this, {
                result: {
                    value: result,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
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
            new CborUInt( 4 ),
            this.result
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryResult
    {
        return QryResult.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryResult
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
        });
    }
}