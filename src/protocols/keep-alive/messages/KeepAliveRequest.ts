import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { isWord16 } from "../../utils/isWord16";

export interface IKeepAliveRequest {
    cookie: number | bigint;
}

export function isIKeepAliveRequest( stuff: any ): stuff is IKeepAliveRequest
{
    return isObject( stuff );
}

export class KeepAliveRequest
    implements ToCborString, ToCborObj, IKeepAliveRequest
{
    readonly cookie: number;
    
    constructor({ cookie }: IKeepAliveRequest )
    {
        if( !isWord16( cookie ) )
        {
            throw new Error("keep alive cookie is not word 16");
        }

        this.cookie = Number( cookie ) | 0;
    }

    toJSON() { return this.toJson(); }
    toJson() { return {}; }

    toCborBytes(): Uint8Array
    {
        return this.toCbor().toBuffer();
    }
    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray
    {
        return new CborArray([
            new CborUInt( 0 ),
            new CborUInt( this.cookie )
        ]);
    }
    
    static fromCbor( cbor: CanBeCborString ): KeepAliveRequest
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return KeepAliveRequest.fromCborObj( Cbor.parse( buff, { keepRef: false } ) );
    }
    static fromCborObj( cbor: CborObj ): KeepAliveRequest
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[0].num === BigInt( 0 )
        )) throw new Error("invalid CBOR for 'KeepAliveRequest");

        return new KeepAliveRequest({
            cookie: cbor.array[1].num
        });
    }
}