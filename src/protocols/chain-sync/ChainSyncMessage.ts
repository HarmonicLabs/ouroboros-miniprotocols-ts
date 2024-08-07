import { isObject } from "@harmoniclabs/obj-utils";
import { CanBeCborString, Cbor, CborArray, CborObj, CborUInt, forceCborString } from "@harmoniclabs/cbor";
import { ChainSyncRequestNext, ChainSyncAwaitReply, ChainSyncRollForward, ChainSyncRollBackwards, ChainSyncFindIntersect, ChainSyncIntersectFound, ChainSyncIntersectNotFound, ChainSyncMessageDone, IChainSyncRequestNext, IChainSyncAwaitReply, IChainSyncRollForward, IChainSyncRollBackwards, IChainSyncFindIntersect, IChainSyncIntersectFound, IChainSyncIntersectNotFound, IChainSyncMessageDone } from "./messages";

export type ChainSyncMessage
    = ChainSyncRequestNext
    | ChainSyncAwaitReply
    | ChainSyncRollForward
    | ChainSyncRollBackwards
    | ChainSyncFindIntersect
    | ChainSyncIntersectFound
    | ChainSyncIntersectNotFound
    | ChainSyncMessageDone;

export function isChainSyncMessage( stuff: any ): stuff is ChainSyncMessage
{
    return isObject( stuff ) && (
        stuff instanceof ChainSyncRequestNext ||
        stuff instanceof ChainSyncAwaitReply ||
        stuff instanceof ChainSyncRollForward ||
        stuff instanceof ChainSyncRollBackwards ||
        stuff instanceof ChainSyncFindIntersect ||
        stuff instanceof ChainSyncIntersectFound ||
        stuff instanceof ChainSyncIntersectNotFound ||
        stuff instanceof ChainSyncMessageDone
    );
}

export type IChainSyncMessage
    = IChainSyncRequestNext // {}
    | IChainSyncAwaitReply // {}
    | IChainSyncRollForward
    | IChainSyncRollBackwards
    | IChainSyncFindIntersect
    | IChainSyncIntersectFound
    | IChainSyncIntersectNotFound
    | IChainSyncMessageDone; // {}


export function isIChainSyncMessage( stuff: any ): stuff is IChainSyncMessage
{
    return isObject( stuff ); // empty object satisfies some of the ChainSync messages
}

export function chainSyncMessageFromCbor( cbor: CanBeCborString ): ChainSyncMessage
{
    const buff = cbor instanceof Uint8Array ? 
        cbor : 
        forceCborString( cbor ).toBuffer();
    
    const msg = chainSyncMessageFromCborObj( Cbor.parse( buff ) );

    // @ts-ignore Cannot assign to 'cborBytes' because it is a read-only property.ts(2540)
    msg.cborBytes = buff;

    return msg;
}
export function chainSyncMessageFromCborObj( cbor: CborObj ): ChainSyncMessage
{
    if(!(
        cbor instanceof CborArray &&
        cbor.array.length >= 1 &&
        cbor.array[0] instanceof CborUInt
    )) throw new Error("invalid cbor for 'ChainSyncMessage'");

    const idx = Number( cbor.array[0].num );

    if( idx === 0 ) return new ChainSyncRequestNext();
    if( idx === 1 ) return new ChainSyncAwaitReply();
    if( idx === 2 ) return ChainSyncRollForward.fromCborObj( cbor );
    if( idx === 3 ) return ChainSyncRollBackwards.fromCborObj( cbor );
    if( idx === 4 ) return ChainSyncFindIntersect.fromCborObj( cbor );
    if( idx === 5 ) return ChainSyncIntersectFound.fromCborObj( cbor );
    if( idx === 6 ) return ChainSyncIntersectNotFound.fromCborObj( cbor );
    if( idx === 7 ) return new ChainSyncMessageDone();

    throw new Error("invalid cbor for 'ChainSyncMessage'; unknown index: " + idx);
}