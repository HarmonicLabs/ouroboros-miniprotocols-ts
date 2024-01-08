# @harmoniclabs/ouroboros-miniprotocols-ts

## What is this? Where am I?

In this repository you'll find a typescript implementation of the [ouroboros networking protocol](https://ouroboros-network.cardano.intersectmbo.org/pdfs/network-spec/network-spec.pdf).

To be precise here you find:
- the data-types with respective CBOR encoding/decoding functions (`toCbor` methods and `fromCbor` static methods)
- all needed for the multiplexer (the `Multiplexer` class and the more low level `wrapMultiplexerMessage` and `unwrapMultiplexerMessage`)
- some protocol-specific enums (`MiniProtcol` and handshake versions).

## Why isn't it called `ouroboros-network-ts`?

The ouroboros network component should also take care of connections with peers.

This package doesn't do that.

The reason is very simple: we might want differnt connections types depending on what is establishing the connection.

example; a cardano node typescript implementation would be designed to operate only in a server environment; in that case a TCP socket would be used to connect to other peers, or a UNIX socket for node-to-client protocols (things like `cardano-cli` or `cardano-db-sync`);

however, a light node implementation, meant to be able to run in browsers, wouldn't be able to have succ connecitons;
the best a browser can offer are `WebSockets`¹ which are a different type of connection; but the data sent and received is the same.


¹<small>currently not supported by the haskell implementaiton of the `cardano-node` but still possible in other implementaitons</small>