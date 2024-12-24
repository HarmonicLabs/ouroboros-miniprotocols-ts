import { isObject } from "@harmoniclabs/obj-utils";
import type { AddressInfo } from "net";

export interface NodeSocketLike {
    /**
     * used to understand if TCP or IPC
     */
    address: () => AddressInfo | {},
    /**
     * used to check if we should retry to connect.
     * used to check if the socket is ready when calling `isReady()`.
     */
    readonly destroyed: boolean,
    /**
     * used to check if the socket is ready when calling `isReady()`.
     * 
     * If `true`,`socket.connect(options[, connectListener])` was
     * called and has not yet finished. It will stay `true` until the socket becomes
     * connected, then it is set to `false` and the `'connect'` event is emitted. Note
     * that the `socket.connect(options[, connectListener])` callback is a listener for the `'connect'` event.
     * @since v6.1.0
     */
    readonly connecting: boolean;
    /**
     * used to check if the socket is ready when calling `isReady()`.
     * 
     * This is `true` if the socket is not connected yet, either because `.connect()`has not yet been called or because it is still in the process of connecting
     * (see `socket.connecting`).
     * @since v11.2.0, v10.16.0
     */
    readonly pending: boolean;
    /**
     * Half-closes the socket. i.e., it sends a FIN packet. It is possible the
     * server will still send some data.
     *
     * See [`writable.end()`](https://nodejs.org/api/stream.html#writableendchunk-encoding-callback) for further details.
     * @since v0.1.90 (node)
     * @param [encoding="utf8"] Only used when data is `string`.
     * @param callback Optional callback for when the socket is finished.
     * @return The socket itself.
    **/
    end(callback?: () => void): this;
    end(buffer: Uint8Array | string, callback?: () => void): this;
    end(str: Uint8Array | string, encoding?: BufferEncoding, callback?: () => void): this;
    /**
     * Sends data on the socket. The second parameter specifies the encoding in the
     * case of a string. It defaults to UTF8 encoding.
     *
     * Returns `true` if the entire data was flushed successfully to the kernel
     * buffer. Returns `false` if all or part of the data was queued in user memory.`"drain"` will be emitted when the buffer is again free.
     *
     * The optional `callback` parameter will be executed when the data is finally
     * written out, which may not be immediately.
     *
     * See `Writable` stream `write()` method for more
     * information.
     * @since v0.1.90 (node)
     * @param [encoding="utf8"] Only used when data is `string`.
    **/
    write(buffer: Uint8Array | string, cb?: (err?: Error) => void): boolean;
    write(str: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean;

    /**
     * subscribe to an event
    **/
    on(event: "close", listener: (hadError: any) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "data", listener: (data: Buffer) => void): this;
    on(event: "connect", listener: () => void): this;
    // on(event: "drain", listener: () => void): this;
    // on(event: "end", listener: () => void): this;
    // on(event: "lookup", listener: (err: Error, address: string, family: string | number, host: string) => void): this;
    // on(event: "ready", listener: () => void): this;
    // on(event: "timeout", listener: () => void): this;
    /**
     * unsubscribe to an event
    **/
    removeListener(event: "close", listener: (hadError: boolean) => void): this;
    removeListener(event: "error", listener: (err: Error) => void): this;
    removeListener(event: "data", listener: (data: Buffer) => void): this;
    removeListener(event: "connect", listener: () => void): this;
}


export function isNodeSocketLike( s: any ): s is NodeSocketLike
{
    return isObject( s ) && (
        typeof s.end            === "function" &&
        typeof s.write          === "function" &&
        typeof s.on             === "function" &&
        typeof s.removeListener === "function"
    );
}

export type NodeSocketLikeEvt
    = "close"
    | "connect"
    | "data"
    | "drain"
    | "end"
    | "error"
    | "lookup"
    | "ready"
    | "timeout";

export interface WebSocketLike {
    /**
     * Transmits data using the WebSocket connection. data can be a string, a Blob, an ArrayBuffer, or an ArrayBufferView.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/WebSocket/send)
    **/
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    /**
     * Closes the WebSocket connection, optionally using code as the the WebSocket connection close code and reason as the the WebSocket connection close reason.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/WebSocket/close)
     */
    close(code?: number, reason?: string): void;
    /**
     * Appends an event listener for events whose type attribute value is type. The callback argument sets the callback that will be invoked when the event is dispatched.
     *
     * The options argument sets listener-specific options. For compatibility this can be a boolean, in which case the method behaves exactly as if the value was specified as options's capture.
     *
     * When set to true, options's capture prevents callback from being invoked when the event's eventPhase attribute value is BUBBLING_PHASE. When false (or not present), callback will not be invoked when event's eventPhase attribute value is CAPTURING_PHASE. Either way, callback will be invoked if event's eventPhase attribute value is AT_TARGET.
     *
     * When set to true, options's passive indicates that the callback will not cancel the event by invoking preventDefault(). This is used to enable performance optimizations described in § 2.8 Observing event listeners.
     *
     * When set to true, options's once indicates that the callback will only be invoked once after which the event listener will be removed.
     *
     * If an AbortSignal is passed for options's signal, then the event listener will be removed when signal is aborted.
     *
     * The event listener is appended to target's event listener list and is not appended if it has the same type, callback, and capture.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener)
     */
    addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    /**
     * Removes the event listener in target's event listener list with the same type, callback, and options.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)
     */
    removeEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    /**
     * [MDN docs](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState)
     * 
     * @returns
     * One of the following unsigned short values:
     *
     * Value |	State     |	Description
     * ------|------------|-----------
     * 0	 | CONNECTING |	Socket has been created. The connection is not yet open.
     * 1	 | OPEN	      |  The connection is open and ready to communicate.
     * 2	 | CLOSING	  |  The connection is in the process of closing.
     * 3	 | CLOSED	  |  The connection is closed or couldn't be opened.
    **/
    readonly readyState: 0 | 1 | 2 | 3;
}

export function isWebSocketLike( s: any ): s is WebSocketLike
{
    return isObject( s ) && (
        typeof s.send                   === "function" &&
        typeof s.close                  === "function" &&
        typeof s.addEventListener       === "function" &&
        typeof s.removeEventListener    === "function"
    );
}

export type WebSocketLikeEvt
    = "close"   // node equivalent of "close" or "end"
    | "error"   // node equivalent of "error"
    | "message" // node equivalent of "data"
    | "open";   // node equivalent of "connect" or "ready"

export type SocketLike = NodeSocketLike | WebSocketLike;

export function isNode2NodeSocket( socketLike: SocketLike ): boolean
{
    // WebSockets only n2n
    if( isWebSocketLike( socketLike ) ) return true;

    return isNodeSocketLike( socketLike ) &&
        // UNIX socket address (node-to-client) is `{}` 
        Object.keys( socketLike.address() ?? {} ).length > 0 ;
}

/**
 * any `SocketLike` but with a common interface
**/
export interface WrappedSocket {
    send: ( data: Uint8Array ) => void
    /**
     * close the comunication
     */
    close: () => void
    /**
     * subscribe to an event
    **/
    on(event: "close", listener: ( hadError: boolean ) => void): void;
    on(event: "error", listener: ( thing: Error | Event ) => void ): void;
    on(event: "data", listener: ( data: Uint8Array ) => void): void;
    on(event: "connect", listener: () => void): void;
    /**
     * unsubscribe to an event
    **/
    off(event: "close", listener: ( hadError: boolean ) => void): void;
    off(event: "error", listener: ( thing: Error | Event ) => void ): void;
    off(event: "data", listener: ( data: Uint8Array ) => void): void;
    off(event: "connect", listener: () => void): void;
    
    /**
     * used to retry connecting the socket in the event is needed after it has been closed
    **/
    reconnect: () => SocketLike;
    isClosed: () => boolean;
    isReady: () => boolean;

    unwrap: <S extends SocketLike>() => S;
}

export type WrappedSocketEvt
    = "close"
    | "error"
    | "data"
    | "connect";

function webSocketLikeIsClosed( this: WebSocketLike ): boolean
{
    return this.readyState >= 2;
}
function webSocketLikeIsReady( this: WebSocketLike ): boolean
{
    return this.readyState === 1;
}

function nodeSocketLikeIsClosed( this: NodeSocketLike ): boolean
{
    return this.destroyed;
}

function nodeSocketLikeIsReady( this: NodeSocketLike ): boolean
{
    return !this.connecting && !this.pending && !this.destroyed;
}

export function wrapSocket(
    socketLike: SocketLike,
    reconnect: ( this: SocketLike ) => SocketLike
): WrappedSocket
{
    const _evts: { [key: string]: any } = {};
    function reconnectSocket()
    {
        const socket = reconnect.call( socketLike );
    }
    if( isWebSocketLike( socketLike ) )
    {
        const socket: WrappedSocket = {
            unwrap: () => socketLike as any,
            reconnect: reconnect.bind( socketLike ),
            isClosed: webSocketLikeIsClosed.bind( socketLike ),
            isReady: webSocketLikeIsReady.bind( socketLike ),
            send: socketLike.send.bind( socketLike ),
            close: socketLike.close.bind( socketLike ),
            on( evt: WrappedSocketEvt, listener: (thing: any) => void ): void
            {
                if( evt === "close" )
                {
                    socketLike.addEventListener(
                        "close",
                        listener
                    );
                }
                else if( evt === "error" )
                {
                    socketLike.addEventListener(
                        "error",
                        listener
                    );
                }
                else if( evt === "connect" )
                {
                    socketLike.addEventListener(
                        "open",
                        listener
                    );
                }
                else if( evt === "data" )
                {
                    socketLike.addEventListener(
                        "message",
                        evt => listener( new Uint8Array( evt.data ) )
                    );
                }
                else {
                    // unknown event type; ignore
                }
            },
            off( evt: WrappedSocketEvt, listener: ( thing: any ) => void ): void
            {
                if( evt === "close" )
                {
                    socketLike.removeEventListener(
                        "close",
                        listener
                    );
                }
                else if( evt === "error" )
                {
                    socketLike.removeEventListener(
                        "error",
                        listener
                    );
                }
                else if( evt === "connect" )
                {
                    socketLike.removeEventListener(
                        "open",
                        listener
                    );
                }
                else if( evt === "data" )
                {
                    socketLike.removeEventListener(
                        "message",
                        evt => listener( new Uint8Array( evt.data ) )
                    );
                }
                else {
                    // unknown event type; ignore
                }
            }
        };

        return Object.freeze( socket );
    }
    else if( isNodeSocketLike( socketLike ) )
    {
        const socket: WrappedSocket = {
            unwrap: () => socketLike as any,
            reconnect: reconnect.bind( socketLike ),
            isClosed: nodeSocketLikeIsClosed.bind( socketLike ),
            isReady: nodeSocketLikeIsReady.bind( socketLike ),
            send: socketLike.write.bind( socketLike ),
            close: socketLike.end.bind( socketLike ),
            on: socketLike.on.bind( socketLike ),
            off: socketLike.removeListener.bind( socketLike ),
        };

        return Object.freeze( socket );
    }
    
    throw new Error("cannot wrap " + socketLike + " as a socket because it doesn't meet the 'SocketLike' interface");
}