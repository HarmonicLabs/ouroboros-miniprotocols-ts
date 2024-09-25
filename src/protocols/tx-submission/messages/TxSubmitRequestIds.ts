import { CanBeCborString, Cbor, CborArray, CborObj, CborSimple, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { canBeUInteger, forceUInteger } from "../../types/ints";
import { isObject } from "@harmoniclabs/obj-utils";
import { assert } from "../../utils/assert";

export interface ITxSubmitRequestIds 
{
    blocking: boolean,
    knownTxCount: number | bigint
    requestedTxCount: number | bigint
}

export function isITxSubmitRequestIds( stuff: any ): stuff is TxSubmitRequestIds
{
    return(
        isObject( stuff ) && 
        typeof stuff.blocking === "boolean" &&
        canBeUInteger( stuff.knownTxCount ) &&
        canBeUInteger( stuff.requestedTxCount )
    );
}

/**
 * Server request of available transactions ids
**/
export class TxSubmitRequestIds
    implements ToCbor, ToCborObj, ITxSubmitRequestIds
{
    private readonly _blocking: boolean;
    get blocking(): boolean { 
        return this._blocking;
    }

    private readonly _knownTxCount: number;
    get knownTxCount(): number {
        return this._knownTxCount;
    }

    private readonly _requestedTxCount: number;
    get requestedTxCount(): number {
        return this._requestedTxCount;
    }
    
    constructor(
        { 
            blocking, 
            knownTxCount, 
            requestedTxCount 
        }
        : ITxSubmitRequestIds 
    )
    {
        assert( 
            isITxSubmitRequestIds( { blocking, knownTxCount, requestedTxCount } ),
            "invalid TxSubmitRequestIds message"
        );
        
        this._blocking = Boolean( blocking );
        this._knownTxCount = forceUInteger( knownTxCount );
        this._requestedTxCount = forceUInteger( requestedTxCount );
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt( 0 ),
            new CborSimple( this.blocking ? 1 : 0 ),
            new CborUInt( this.knownTxCount ),
            new CborUInt( this.requestedTxCount )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxSubmitRequestIds
    {
        return TxSubmitRequestIds.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxSubmitRequestIds
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 4 
        )) throw new Error( "invalid CBOR for 'TxSubmitRequestIds" );

        const [ 
            cborMsgTag,
            cborBlocking, 
            cborKnownTxCount, 
            cborRequestedTxCount 
        ] = cbor.array;

        if(!(
            cborMsgTag instanceof CborUInt &&
            Number( cborMsgTag.num ) === 0 &&
            cborBlocking instanceof CborSimple &&
            cborKnownTxCount instanceof CborUInt &&
            cborRequestedTxCount instanceof CborUInt
        )) throw new Error( "invalid CBOR for 'TxSubmitRequestIds" );

        return new TxSubmitRequestIds({
            blocking: cborBlocking.simple === 1 ? true : false,
            knownTxCount: cborKnownTxCount.num,
            requestedTxCount: cborRequestedTxCount.num,
        });
    }
}
