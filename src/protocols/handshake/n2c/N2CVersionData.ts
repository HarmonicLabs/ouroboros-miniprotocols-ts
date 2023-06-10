import { CanBeCborString, Cbor, CborArray, CborObj, CborSimple, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { NetworkMagic, isNetworkMagic, forceNetworkMagic } from "../../types/NetworkMagic";
import { isObject } from "@harmoniclabs/obj-utils";

export interface IOldN2CVersionData { networkMagic: NetworkMagic };

export type IOldN2CVersionDataAsClass = N2CVersionData & { query: undefined };

export function isIOldN2CVersionData( stuff: any ): stuff is IOldN2CVersionData
{
    return isObject( stuff ) && isNetworkMagic( stuff.networkMagic );
}

export interface IUpTo16N2CVersionData {
    networkMagic: NetworkMagic,
    query: boolean
}

export function isIUpTo16N2CVersionData( stuff: any ): stuff is IUpTo16N2CVersionData
{
    return (
        isObject( stuff ) &&
        isNetworkMagic( stuff.networkMagic ) &&
        typeof stuff.query === "boolean"
    );
}

export interface IN2CVersionData {
    networkMagic: NetworkMagic,
    query?: boolean
}

export function isIN2CVersionData( stuff: any ): stuff is IN2CVersionData
{
    return isIOldN2CVersionData( stuff ) || isIUpTo16N2CVersionData( stuff );
}

export type UpTo16N2CVersionData = N2CVersionData & IUpTo16N2CVersionData;

export class N2CVersionData
    implements ToCbor, ToCborObj, IN2CVersionData
{
    readonly networkMagic!: NetworkMagic;
    readonly query?: boolean | undefined;

    constructor( data: IN2CVersionData )
    {
        let networkMagic: NetworkMagic;
        let query: boolean | undefined = undefined;

        if( isNetworkMagic( data ) ) networkMagic = data;
        else {
            networkMagic = data.networkMagic;
            query = data.query;
        }

        if( !isNetworkMagic( networkMagic ) ) throw new Error("invalid network magic");
        if( query !== undefined && typeof query !== "boolean" ) throw new Error("invalid query option");

        Object.defineProperties(
            this, {
                networkMagic: {
                    value: networkMagic,
                    writable: false,
                    enumerable: true,
                    configurable: false
                },
                query: {
                    value: query,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj(): CborArray | CborUInt
    {
        if( typeof this.query === "boolean" )
        {
            return new CborArray([
                new CborUInt( this.networkMagic ),
                new CborSimple( this.query )
            ]);
        }
        else return new CborUInt( this.networkMagic )
    }

    static fromCbor( cbor: CanBeCborString ): N2CVersionData
    {
        return N2CVersionData.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): N2CVersionData
    {
        if( cbor instanceof CborUInt ) return new N2CVersionData({ networkMagic: forceNetworkMagic( cbor.num ) });

        if( !(cbor instanceof CborArray) ) throw new Error("invalid CBOR for N2CVersionData");
        
        const [ _net, _query ] = cbor.array;
        let query: boolean | undefined = undefined;

        if(!(
            _net instanceof CborUInt
        )) throw new Error("invalid CBOR for N2CVersionData");

        if( _query )
        {
            if(!(
                _query instanceof CborSimple &&
                typeof _query.simple === "boolean"
            ))
            throw new Error("invalid CBOR for N2CVersionData");
            query = _query.simple;
        }

        return new N2CVersionData({
            networkMagic: forceNetworkMagic( _net.num ),
            query
        });
    }
}