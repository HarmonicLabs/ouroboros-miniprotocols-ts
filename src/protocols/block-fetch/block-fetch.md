```mermaid
flowchart TD
    Idle
    Done
    Busy
    Streaming

    Idle --"ClientDone"--> Done
    Idle --"RequestRange"--> Busy
    Busy --"NoBlocks"--> Idle
    Busy --"StartBatch"--> Streaming
    Streaming --"Block"--> Streaming
    Streaming --"BatchDone"--> Idle
```