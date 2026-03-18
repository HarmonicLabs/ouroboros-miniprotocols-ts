import * as Schema from "effect/Schema";

export enum MiniProtocol {
  Handshake = 0,
  ChainSync = 2,
  LocalChainSync = 5,
  BlockFetch = 3,
  TxSubmission = 4,
  LocalTxSubmission = 6,
  LocalStateQuery = 7,
  KeepAlive = 8,
  LocalTxMonitor = 9,
  PeerSharing = 10,
}

export const MiniProtocolSchema = Schema.Enum(MiniProtocol);
