import { Cbor, CborObj } from "@harmoniclabs/cbor";
import { MiniProtocol } from "../../MiniProtocol";
import { Multiplexer } from "../../multiplexer/Multiplexer";
import { IChainPoint } from "../types/ChainPoint";
import { LocalTxMessage, localTxSubmitMessageFromCborObj } from "./LocalTxMessage";
import { LocalTxAccept } from "./LocalTxAccept";
import { LocalTxReject } from "./LocalTxReject";
import { LocalTxSubmit } from "./LocalTxSubmit";
import { LocalTxDone } from "./LocalTxDone";

const roDescr = {
    writable: false,
    enumerable: true,
    configurable: false
};

type LocalTxClientEvtListener = ( msg: LocalTxMessage ) => void;

type LocalTxClientEvtListeners = {
    submit: LocalTxClientEvtListener[],
    reject: LocalTxClientEvtListener[],
    accept: LocalTxClientEvtListener[],
    done  : LocalTxClientEvtListener[],
};

type LocalTxClientEvt = keyof LocalTxClientEvtListeners;

function msgToName( msg: LocalTxMessage ): LocalTxClientEvt | undefined
{
    if( msg instanceof LocalTxSubmit ) return "submit";
    if( msg instanceof LocalTxReject ) return "reject";
    if( msg instanceof LocalTxAccept ) return "accept";
    if( msg instanceof LocalTxDone )   return "done";

    return undefined;
}

export class LocalTxClient
{
    readonly mplexer: Multiplexer;

    clearListeners!: () => void;

    constructor( multiplexer: Multiplexer )
    {
        const eventListeners: LocalTxClientEvtListeners = {
            submit: [],
            reject: [],
            accept: [],
            done: [],
        };

        function clearListeners(): void
        {
            eventListeners.submit.length = 0;
            eventListeners.reject.length = 0;
            eventListeners.accept.length = 0;
            eventListeners.done.length   = 0;
        }

        function hasEventListeners(): boolean
        {
            return (
                eventListeners.submit.length > 0 ||
                eventListeners.reject.length > 0 ||
                eventListeners.accept.length > 0 ||
                eventListeners.done.length   > 0
            );
        }

        function onSubmit( cb: ( msg: LocalTxSubmit ) => void ): void
        {
            eventListeners.submit.push( cb );
        }
        function onReject( cb: ( msg: LocalTxReject ) => void ): void
        {
            eventListeners.reject.push( cb );
        }
        function onAccept( cb: ( msg: LocalTxAccept ) => void ): void
        {
            eventListeners.accept.push( cb );
        }
        function onDone( cb: ( msg: LocalTxDone ) => void ): void
        {
            eventListeners.done.push( cb );
        }

        Object.defineProperties(
            this, {
                mplexer: {
                    value: multiplexer,
                    ...roDescr
                },
                clearListeners: {
                    value: clearListeners,
                    ...roDescr
                },
                onSubmit: {
                    value: onSubmit,
                    ...roDescr
                },
                onReject: {
                    value: onReject,
                    ...roDescr
                },
                onAccept: {
                    value: onAccept,
                    ...roDescr
                },
                onDone: {
                    value: onDone,
                    ...roDescr
                },
            }
        );

        let prevBytes: Uint8Array | undefined = undefined;
        const queque: LocalTxMessage[] = [];

        multiplexer.onTxSubmission( chunk => {

            if( !hasEventListeners() ) return;

            let offset: number = -1;
            let thing: { parsed: CborObj, offset: number };

            let msg: LocalTxMessage;

            if( prevBytes )
            {
                /*
                console.log( "prevBytes.length", prevBytes.length );
                console.log( "chunk.length", chunk.length );
                console.log( "prevBytes.length + chunk.length", prevBytes.length + chunk.length );

                console.log( "prevBytes", toHex( prevBytes ) );
                console.log( "chunk", toHex( chunk ) );
                // */

                const tmp = new Uint8Array( prevBytes.length + chunk.length );
                tmp.set( prevBytes, 0 );
                tmp.set( chunk, prevBytes.length );
                chunk = tmp;
                prevBytes = undefined;
            }

            while( true )
            {
                try {
                    thing = Cbor.parseWithOffset( chunk );
                }
                catch
                {
                    // assume the error is of "missing bytes";
                    prevBytes = chunk.slice();
                    break;
                }
                
                offset = thing.offset;

                // console.log( "msg byetes", offset, toHex( chunk.subarray( 0, offset ) ) );
                msg = localTxSubmitMessageFromCborObj( thing.parsed )
                queque.unshift( msg );

                if( offset < chunk.length )
                {
                    // reference same memory (`subarray`)
                    // ignore the parsed bytes
                    chunk = chunk.subarray( offset );
                    continue;
                }
                else // if( offset >= chunk.length )
                {
                    prevBytes = undefined;
                    break;
                }
            }

            let msgStr: LocalTxClientEvt;
            while( msg = queque.pop()! )
            {
                msgStr = msgToName( msg )!;
                if( !msgStr ) continue; // ingore messages not expected by the client

                const listeners = eventListeners[ msgStr ];
                for( const cb of listeners )
                {
                    void cb( msg );
                }
            }

        });
    }

    onSubmit: ( cb: ( msg: LocalTxSubmit ) => void ) => void
    onReject: ( cb: ( msg: LocalTxReject ) => void ) => void
    onAccept: ( cb: ( msg: LocalTxAccept ) => void ) => void
    onDone:   ( cb: ( msg: LocalTxDone   ) => void ) => void

    submit( txData: Uint8Array ): void
    {
        this.mplexer.send(
            new LocalTxSubmit({ tx: txData }).toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: MiniProtocol.LocalTxSubmission
            }
        );
    }

    done(): void
    {
        this.mplexer.send(
            new LocalTxDone().toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: MiniProtocol.LocalTxSubmission
            }
        );
        this.clearListeners();
    }
}