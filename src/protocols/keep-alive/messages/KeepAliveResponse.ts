import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { isWord16 } from "../../utils/isWord16";

export interface IKeepAliveResponse {
    cookie: number | bigint;
}

export function isIKeepAliveResponse( stuff: any ): stuff is IKeepAliveResponse
{
    return isObject( stuff );
}

export class KeepAliveResponse
    implements ToCborString, ToCborObj, IKeepAliveResponse
{
    readonly cookie: number;
    
    constructor( { cookie }: IKeepAliveResponse )
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
            new CborUInt( 1 ),
            new CborUInt( this.cookie )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): KeepAliveResponse
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        return KeepAliveResponse.fromCborObj( Cbor.parse( buff ) );
    }
    static fromCborObj( cbor: CborObj ): KeepAliveResponse
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[1] instanceof CborUInt &&
            cbor.array[0].num === BigInt( 1 )
        )) throw new Error("invalid CBOR for 'KeepAliveResponse");

        return new KeepAliveResponse({
            cookie: cbor.array[1].num
        });
    }
}