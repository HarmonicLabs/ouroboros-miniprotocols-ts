```mermaid
flowchart LR
    Idle
    Acquiring
    Acquired
    Querying
    Done

    Start --> Idle

    Idle -- msgAcquire --> Acquiring
    
    Acquiring -- msgFailure --> Idle
    Acquiring -- msgAcquired --> Acquired

    Acquired -- msgReAcquire --> Acquiring

    Acquired -- msgQuery --> Querying
    Querying -- msgResult --> Acquired

    Acquired -- msgRelease --> Idle

    Idle -- msgDone --> Done
```