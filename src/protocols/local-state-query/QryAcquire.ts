import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { ChainPoint, IChainPoint, isIChainPoint } from "../types/ChainPoint";

export interface IQryAcquire {
    point?: IChainPoint
};

export function isIQryAcquire( stuff: any ): stuff is IQryAcquire
{
    return isObject( stuff ) && (stuff.point === undefined || isIChainPoint( stuff.point ));
}

export class QryAcquire
    implements ToCbor, ToCborObj, IQryAcquire
{
    readonly point?: ChainPoint;

    constructor( iacquire: IQryAcquire = {} )
    {
        iacquire = iacquire ?? {};
        if(!isIQryAcquire( iacquire )) throw new Error("invalid interface for 'QryAcquire'");

        Object.defineProperty(
            this, "point", {
                value: iacquire.point ? new ChainPoint( iacquire.point ) : undefined,
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
        const arr: CborObj[] = [ new CborUInt( this.point ? 0 : 8 ) ];
        if( this.point )
        {
            arr.push( this.point.toCborObj() )
        }
        return new CborArray( arr );
    }

    static fromCbor( cbor: CanBeCborString ): QryAcquire
    {
        return QryAcquire.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryAcquire
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 1 &&
            cbor.array[0] instanceof CborUInt
        )) throw new Error("invalid CBOR for 'QryAcquire");

        const num = Number( cbor.array[0].num );

        if( num === 0 )
        {
            if( cbor.array.length < 2 )
            throw new Error("invalid CBOR for 'QryAcquire");

            return new QryAcquire({
                point: ChainPoint.fromCborObj(
                    cbor.array[1]
                )
            });
        }
        if( num === 8 ) return new QryAcquire({});

        throw new Error("invalid CBOR for 'QryAcquire'; unknown index: " + num.toString());
    }
}