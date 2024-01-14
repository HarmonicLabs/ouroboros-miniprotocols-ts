import { toHex } from "@harmoniclabs/uint8array-utils";
import { MiniProtocol } from "../MiniProtocol";

export interface MultiplexerHeaderInfos {
    hasAgency: boolean,
    protocol: MiniProtocol,
    transmissionTime?: number,
    payloadLength?: number
}

export interface MultiplexerHeader {
    hasAgency: boolean,
    protocol: MiniProtocol,
    transmissionTime: number,
    payloadLength: number
}

export function wrapMultiplexerMessage(
    payload: Uint8Array,
    {
        protocol,
        hasAgency
    }: MultiplexerHeaderInfos
): Uint8Array
{
    // Mini Protocol ID The unique ID of the mini protocol as in tables 2.2 and 2.3.

    /**
     * - 4 bytes (32 bits) for transmission time (calculated only at the end)
     * - 1 bit for _mode_:
     *      - `0` if the sender has agency (initiates the mini protocol)
     *      - `1` otherwhise
     * - 15 bits for the mini protocol ID (see `MiniProtocol` enum above)
     * - 16 bits for the payload-length
     * - payload
    **/
    const buff = new ArrayBuffer( payload.length + 8 ) 
    const result = new Uint8Array( buff );
    const view = new DataView( buff );

    view.setUint16(
        4, // byteOffset
        /**
         * - 1 bit for _mode_:
         *     - `0` if the sender has agency (initiates the mini protocol)
         *     - `1` otherwhise
         */
        ( hasAgency ? 0 : 1 << 15 ) |
        // - 15 bits for the mini protocol ID (see `MiniProtocol` enum above)
        ( protocol & 0xffff ),
        false, // littleEndian = false 
    );

    view.setUint16(
        6, // byteOffset
        // - 16 bits for the payload-length
        payload.length & 0xffff,
        false, // littleEndian = false 
    );

    // - payload
    result.set( payload, 8 );

    // - 4 bytes (32 bits) for transmission time (calculated only at the end)
    //
    // Transmission Time
    // The transmission time is a time stamp based
    // the **lower 32 bits** of the sender’s **monotonic clock**
    // with a resolution of one microsecond.
    view.setInt32(
        0,
        Math.ceil( performance.timeOrigin * 1000 + performance.now() * 1000 ) & 0xffffffff,
        false, // littleEndian = false
    );
    return result;
}

const agencyMask = 0x8000; // ( 1 << 15 )
const protoclMask  = 0x7fff; // ~agencyMask & 0xffff;

export type MultiplexerMessage = {
    header: MultiplexerHeader,
    payload: Uint8Array
};

/**
 * @deprecated use `unwrapMultiplexerMessages`
 */
export function unwrapMultiplexerMessage(
    message: Uint8Array
): MultiplexerMessage
{
    const agencyAndProtocol = message[4] << 8 | message[5];
    const payloadLen = message[6] << 8 | message[7];
    return {
        header: {
            transmissionTime: (message[0] << 24) | (message[1] << 16) | (message[2] << 8) | message[3],
            hasAgency: (agencyAndProtocol & agencyMask) > 0,
            protocol: agencyAndProtocol & protoclMask,
            payloadLength: payloadLen
        },
        payload: message.slice( 8, 8 + payloadLen )
    };
}

export function unwrapMultiplexerMessages(
    message: Uint8Array
): MultiplexerMessage[]
{
    const messages: MultiplexerMessage[] = [];
    while( message.length >= 8 )
    {
        // bitwise opeartor (or and shift) implicitly convert to signed int32
        // but these are 2 bytes long numbers, hence always positive
        const agencyAndProtocol = message[4] << 8 | message[5];
        const payloadLen = message[6] << 8 | message[7];
        const uint32View = new Uint32Array( message.slice(4,8).buffer );

        messages.push({
            header: {
                transmissionTime: uint32View[0],
                hasAgency: (agencyAndProtocol & agencyMask) > 0,
                protocol: agencyAndProtocol & protoclMask,
                payloadLength: payloadLen
            },
            payload: Uint8Array.prototype.slice.call( message, 8, 8 + payloadLen )
        });

        message = Uint8Array.prototype.slice.call( message, 8 + payloadLen );
    }
    return messages
}