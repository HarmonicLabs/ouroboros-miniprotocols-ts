```mermaid
flowchart LR
    Idle
    Busy

    Start --> Idle
    subgraph "client"
        Idle -- msgDone --> Done
    end
    subgraph "server"
        Idle -- msgSubmitTx --> Busy
        Busy -- msgRejectTx --> Idle
        Busy -- msgAcceptTx --> Idle
    end
    
    
```