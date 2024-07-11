import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IQryQuery {
    /**
     * not fixed in the specification;
     * 
     * check `query.cddl` for valid cardano queries
    **/
    query: CborObj
}

export class QryQuery
    implements ToCbor, ToCborObj, IQryQuery
{
    readonly query: CborObj;

    constructor({ query }: IQryQuery)
    {
        if(!(
            isCborObj( query )
        )) throw new Error("invalid IQryQuery interface");

        Object.defineProperties(
            this, {
                query: {
                    value: query,
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
            new CborUInt( 3 ),
            this.query
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryQuery
    {
        return QryQuery.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryQuery
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt( 3 )
        )) throw new Error("invalid CBOR for 'QryQuery");

        const [ _idx, _queryCbor ] = cbor.array;

        return new QryQuery({
            query: cbor.array[1]
        });
    }
}