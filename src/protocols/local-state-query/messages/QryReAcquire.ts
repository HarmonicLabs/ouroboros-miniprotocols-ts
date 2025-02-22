import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
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
    implements ToCborString, ToCborObj, IQryReAcquire
{
    readonly point?: ChainPoint;

    constructor( acq: IQryReAcquire = {} )
    {
        acq = acq ?? {};
        if(!isIQryReAcquire( acq )) throw new Error("invalid interface for 'QryReAcquire'");

        this.point = isIChainPoint( acq.point ) ? new ChainPoint( acq.point ) : undefined;
    };

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
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