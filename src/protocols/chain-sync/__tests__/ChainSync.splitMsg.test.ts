import { connect } from "node:net";
import { Multiplexer } from "../../../multiplexer/Multiplexer";
import { ChainSyncClient } from "../ChainSyncClient";
import { N2CHandshakeVersion, N2CMessageAcceptVersion, N2CMessageProposeVersion, n2cHandshakeMessageFromCbor } from "../../handshake";
import { MiniProtocol } from "../../../MiniProtocol";
import { toHex } from "@harmoniclabs/uint8array-utils";
import { chainSyncMessageFromCbor } from "../ChainSyncMessage";
import { ChainSyncRollForward } from "../ChainSyncRollForward";

jest.setTimeout( 15_000 );

test.skip("ChainSync", async () => {

    const mplexer = new Multiplexer(
        {
            connect: () => connect({ path: process.env.CARDANO_NODE_SOCKET_PATH ?? "" },),
            protocolType: "node-to-client"
        }
    );

    const chainSyncClient = new ChainSyncClient( mplexer );

    mplexer.on("Handshake",( chunk, header ) => {
        const msg = n2cHandshakeMessageFromCbor( chunk );
        console.log( msg );
    });

    const msgs: ChainSyncRollForward[] = [];
    let i = 0;
    chainSyncClient.on("rollForward", ( msg ) => {
        msgs.push( msg );
    });

    // handshake
    await new Promise<void>(( resolve => {
        mplexer.on("Handshake", chunk => {

            const msg = n2cHandshakeMessageFromCbor( chunk );

            if( msg instanceof N2CMessageAcceptVersion )
            {
                mplexer.clearListeners( MiniProtocol.Handshake );
                resolve();
            }
            else {
                throw new Error("TODO: handle rejection")
            }
        });

        mplexer.send(
            new N2CMessageProposeVersion({
                versionTable: [
                    {
                        version: N2CHandshakeVersion.v10,
                        data: {
                            networkMagic: 1
                        }
                    }
                ]
            }).toCbor().toBuffer(),
            {
                hasAgency: true,
                protocol: MiniProtocol.Handshake
            }
        );
    }));
    
    for( let i = 0; i < 100; i++ )
    {
        chainSyncClient.requestNext();
    }

    await new Promise<void>( res => setTimeout(() => {
        mplexer.close();
        console.log( "tot roll froward", msgs.length );
        res();
    }, 5000 ) );


})