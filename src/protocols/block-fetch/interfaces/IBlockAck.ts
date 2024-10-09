import { CanBeCborString, Cbor, CborArray, CborUInt, CborString, ToCbor, ToCborObj, forceCborString, CborObj } from "@harmoniclabs/cbor";

export interface IBlockAck
{
    readonly blockSlotNo: number | bigint;
}

function isBlockAck( stuff: any ): stuff is IBlockAck
{
    return (
        typeof stuff === "object" &&
        (
            Number.isInteger( stuff.blockSlotNo ) ||
            typeof stuff.blockSlotNo === "bigint"
        )
    );
}

export class BlockAck implements ToCbor, ToCborObj, IBlockAck {
    readonly blockSlotNo: number | bigint;

    constructor(blockSlotNo: number | bigint) {
        this.blockSlotNo = blockSlotNo;
    }

    toCbor(): CborString {
        return new CborString(this.toCborBytes());
    }

    toCborObj(): CborArray {
        return new CborArray([
            new CborUInt(this.blockSlotNo)
        ]);
    }

    toCborBytes(): Uint8Array {
        return Cbor.encode(this.toCborObj()).toBuffer();
    }

    static fromCbor(cbor: CanBeCborString): BlockAck {
        const buff = cbor instanceof Uint8Array ? cbor : forceCborString(cbor).toBuffer();
        return BlockAck.fromCborObj(Cbor.parse(buff));
    }

    static fromCborObj(cbor: CborObj): BlockAck {
        if (!(cbor instanceof CborArray && cbor.array.length === 2 && cbor.array[0] instanceof CborUInt && cbor.array[0].num === BigInt(5))) {
            throw new Error("invalid CBOR for 'BlockAck'");
        }

        const blockSlotNo = cbor.array[1];
        if (!(blockSlotNo instanceof CborUInt)) {
            throw new Error("invalid CBOR for 'BlockAck'");
        }

        return new BlockAck(blockSlotNo.num);
    }
}
