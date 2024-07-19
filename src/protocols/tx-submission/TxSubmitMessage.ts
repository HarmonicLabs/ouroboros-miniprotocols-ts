import { TxSubmitDone, ITxSubmitDone } from "./messages/TxSubmitDone";
import { TxSubmitInit, ITxSubmitInit } from "./messages/TxSubmitInit";
import { TxSubmitReplyIds, ITxSubmitReplyIds } from "./messages/TxSubmitReplyIds";
import { TxSubmitReplyTx, ITxSubmitReplyTx } from "./messages/TxSubmitReplyTx";
import { TxSubmitRequestIds, ITxSubmitRequestIds } from "./messages/TxSubmitRequestIds";
import { TxSubmitRequestTxs, ITxSubmitRequestTxs } from "./messages/TxSubmitRequestTxs";

export type TxSubmitMessage 
    = TxSubmitDone 
    | TxSubmitInit 
    | TxSubmitReplyIds
    | TxSubmitReplyTx
    | TxSubmitRequestIds
    | TxSubmitRequestTxs;

export type ITxSubmitMessage 
    = ITxSubmitDone 
    | ITxSubmitInit 
    | ITxSubmitReplyIds
    | ITxSubmitReplyTx
    | ITxSubmitRequestIds
    | ITxSubmitRequestTxs;