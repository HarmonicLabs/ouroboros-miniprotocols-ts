import { CanBeCborString, Cbor, CborArray, CborObj, CborString, CborUInt, ToCbor, ToCborObj, forceCborString } from "@harmoniclabs/cbor";
import { MiniProtocol, miniProtocolToString } from "../../../MiniProtocol";

export enum QryFailureReason {
    pointTooOld = 0,
    pointNotOnChain = 1
}

Object.freeze( QryFailureReason );

export function isQryFailureReason( stuff: any ): stuff is QryFailureReason
{
    return stuff === 0 || stuff === 1;
}

export interface IQryFailure {
    reason: QryFailureReason
}

export class QryFailure
    implements ToCbor, ToCborObj, IQryFailure
{
    readonly reason: QryFailureReason;

    constructor({ reason }: IQryFailure)
    {
        if(!(
            isQryFailureReason( reason )
        )) throw new Error("invalid IQryFailure interface");

        Object.defineProperties(
            this, {
                reason: {
                    value: reason,
                    writable: false,
                    enumerable: true,
                    configurable: false
                }
            }
        );
    };

    toJSON()
    {
        return this.toJson();
    }
    toJson()
    {
        return {
            protocol: miniProtocolToString( MiniProtocol.LocalStateQuery ),
            message: "QryFailure",
            data: {
                reason:
                    typeof this.reason === "number" ?
                        QryFailureReason[ this.reason ] :
                        this.reason
            }
        }
    }

    toCbor(): CborString
    {
        return Cbor.encode( this.toCborObj() );
    }
    toCborObj()
    {
        return new CborArray([
            new CborUInt( 2 ),
            new CborUInt( this.reason )
        ]);
    }

    static fromCbor( cbor: CanBeCborString ): QryFailure
    {
        return QryFailure.fromCborObj( Cbor.parse( forceCborString( cbor ) ) );
    }
    static fromCborObj( cbor: CborObj ): QryFailure
    {
        if(!(
            cbor instanceof CborArray &&
            cbor.array.length >= 2 &&
            cbor.array[0] instanceof CborUInt &&
            cbor.array[0].num === BigInt( 2 ) &&
            cbor.array[1] instanceof CborUInt
        )) throw new Error("invalid CBOR for 'QryFailure");

        const [ _idx, _reasonCbor ] = cbor.array;

        return new QryFailure({
            // constructor checks for correct interface (and correct reason)
            reason: Number( _reasonCbor.num )
        });
    }
}