import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { getCborBytesDescriptor } from "../../utils/getCborBytesDescriptor";
import { isWord16 } from "../../utils/isWord16";

export interface IKeepAliveResponse {
    cookie: number | bigint;
}

export function isIKeepAliveResponse( stuff: any ): stuff is IKeepAliveResponse
{
    return isObject( stuff );
}

export class KeepAliveResponse
    implements ToCbor, ToCborObj, IKeepAliveResponse
{
    readonly cborBytes?: Uint8Array | undefined;

    readonly cookie: number;
    
    constructor( { cookie }: IKeepAliveResponse )
    {
        if( !isWord16( cookie ) )
        {
            throw new Error("keep alive cookie is not word 16");
        }

        Object.defineProperties( 
            this, {
                cborBytes: getCborBytesDescriptor(),
                cookie: {
                    value: Number( cookie ),
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    toJson() { return {}; }

    toCbor(): CborString
    {
        return new CborString( this.toCborBytes() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt( 1 ),
            new CborUInt( this.cookie )
        ]);
    }
    toCborBytes(): Uint8Array
    {
        if(!( this.cborBytes instanceof Uint8Array ))
        {
            // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.
            this.cborBytes = Cbor.encode( this.toCborObj() ).toBuffer();
        }

        return Uint8Array.prototype.slice.call( this.cborBytes );
    }

    static fromCbor( cbor: CanBeCborString ): KeepAliveResponse
    {
        const buff = cbor instanceof Uint8Array ?
            cbor: 
            forceCborString( cbor ).toBuffer();
            
        const msg = KeepAliveResponse.fromCborObj( Cbor.parse( buff ) );
        
        // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
        msg.cborBytes = buff;
        
        return msg;
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