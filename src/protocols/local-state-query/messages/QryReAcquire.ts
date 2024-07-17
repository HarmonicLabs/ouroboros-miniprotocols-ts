import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { ChainPoint, IChainPoint, isIChainPoint } from "../../types/ChainPoint";

export interface IQryReAcquire {
    point?: IChainPoint
};

export function isIQryReAcquire( stuff: any ): stuff is IQryReAcquire
{
    return isObject( stuff ) && (stuff.point === undefined || isIChainPoint( stuff.point ));
}

export class QryReAcquire
    implements ToCbor, ToCborObj, IQryReAcquire
{
    readonly point?: ChainPoint;

    constructor( iacquire: IQryReAcquire = {} )
    {
        iacquire = iacquire ?? {};
        if(!isIQryReAcquire( iacquire )) throw new Error("invalid interface for 'QryReAcquire'");

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
        const arr: CborObj[] = [ new CborUInt( this.point ? 6 : 9 ) ];
        if( this.point )
        {
            arr.push( this.point.toCborObj() )
        }
        return new CborArray( arr );
    }

    static fromCbor( cbor: CanBeCborString ): QryReAcquire
    {
        return QryReAcquire.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryReAcquire
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 1 &&
            cbor.array[0] instanceof CborUInt
        )) throw new Error("invalid CBOR for 'QryReAcquire");

        const num = Number( cbor.array[0].num );

        if( num === 6 )
        {
            if( cbor.array.length < 2 )
            throw new Error("invalid CBOR for 'QryReAcquire");

            return new QryReAcquire({
                point: ChainPoint.fromCborObj(
                    cbor.array[1]
                )
            });
        }
        if( num === 9 ) return new QryReAcquire({});

        throw new Error("invalid CBOR for 'QryReAcquire'; unknown index: " + num.toString());
    }
}