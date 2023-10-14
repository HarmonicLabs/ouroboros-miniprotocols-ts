```mermaid
flowchart LR
    Idle
    Acquiring
    Acquired
    Busy

    Start --> Idle
    Idle -- msgAcquire --> Acquiring
    Acquiring -- msgAwaitAcquire --> Acquiring
    Acquiring -- msgAcquired --> Acquired
    Acquired -- msgRelease --> Idle

    Acquired -- msgNextTx --> Busy
    Busy -- msgReplyNextTx --> Acquired

    Acquired -- msgHasTx --> Busy
    Busy -- msgReplyHasTx --> Acquired

    Acquired -- msgGetSizes --> Busy
    Busy -- msgReplyGetSizes --> Acquired

    Idle -- msgDone --> Done

```