import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, forceCborString, isCborObj } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getSubCborRef, subCborRefOrUndef } from "../../utils/getSubCborRef";

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

    constructor(
        qry: IQryQuery,
        readonly cborRef: SubCborRef | undefined = undefined
    )
    {
        const { query } = qry;
        if(!(
            isCborObj( query )
        )) throw new Error("invalid IQryQuery interface");

        this.query = query;
        // only query message to keep track of the original bytes
        // because data might actually be hashed by the client
        this.cborRef = cborRef ?? subCborRefOrUndef( qry );
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
            new CborUInt( 3 ),
            this.query
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryQuery
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
        return QryQuery.fromCborObj( Cbor.parse( bytes, { keepRef: true } ), bytes );
    }
    static fromCborObj(
        cbor: CborObj,
        originlBytes: Uint8Array | undefined = undefined
    ): QryQuery
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
        }, getSubCborRef( cbor, originlBytes ));
    }
}