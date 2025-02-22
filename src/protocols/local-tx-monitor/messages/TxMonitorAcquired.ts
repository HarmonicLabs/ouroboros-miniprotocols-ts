import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, ToCborString, forceCborString } from "@harmoniclabs/cbor";
import { isObject } from "@harmoniclabs/obj-utils";
import { canBeUInteger, forceBigUInt } from "../../types/ints";

export interface ITxMonitorAcquired {
    slotNumber: number | bigint
}

export function isITxMonitorAcquired( stuff: any ): stuff is ITxMonitorAcquired
{
    return isObject( stuff ) && canBeUInteger( stuff.slotNumber );
}

export class TxMonitorAcquired
    implements ToCborString, ToCborObj, ITxMonitorAcquired
{
    readonly slotNumber: bigint;
    
    constructor({ slotNumber }: ITxMonitorAcquired )
    {
        if(!isITxMonitorAcquired({ slotNumber }))
        throw new Error("invalid interface for 'TxMonitorAcquired'");

        this.slotNumber = forceBigUInt( slotNumber );
    };

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
            new CborUInt( 2 ),
            new CborUInt( this.slotNumber )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): TxMonitorAcquired
    {
        return TxMonitorAcquired.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): TxMonitorAcquired
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt(2) &&
            cbor.array[1] instanceof CborUInt
        )) throw new Error("invalid CBOR for 'TxMonitorAcquired");

        return new TxMonitorAcquired({
            slotNumber: cbor.array[1].num
        });
    }
}