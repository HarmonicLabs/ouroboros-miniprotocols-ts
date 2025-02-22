import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, SubCborRef, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { IChainPoint, isIChainPoint, ChainPoint } from "../../types/ChainPoint";

export interface IQryAcquire {
    point?: IChainPoint
};

export function isIQryAcquire( stuff: any ): stuff is IQryAcquire
{
    return isObject( stuff ) && (stuff.point === undefined || isIChainPoint( stuff.point ));
}

export class QryAcquire
    implements ToCborString, ToCborObj, IQryAcquire
{
    readonly point?: ChainPoint;

    constructor( acq: IQryAcquire )
    {
        acq = acq ?? {};
        if(!isIQryAcquire( acq )) throw new Error("invalid interface for 'QryAcquire'");

        this.point = (
            acq.point instanceof ChainPoint ? acq.point :
            isIChainPoint( acq.point ) ? new ChainPoint( acq.point ) :
            undefined
        );
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
        const arr: CborObj[] = [ new CborUInt( this.point ? 0 : 8 ) ];
        if( this.point )
        {
            arr.push( this.point.toCborObj() )
        }
        return new CborArray( arr );
    }

    static fromCbor( cbor: CanBeCborString ): QryAcquire
    {
        const bytes = cbor instanceof Uint8Array ? cbor : forceCborString( cbor ).toBuffer();
        return QryAcquire.fromCborObj(
            Cbor.parse( bytes, { keepRef: false } )
        );
    }
    static fromCborObj(
        cbor: CborObj,
        originalBytes: Uint8Array | undefined = undefined
    ): QryAcquire
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