# 🛡️ Failure Scenarios & High Availability

> "In Banking, consistency is not optional."

This document details how Chronicle Ledger handles distributed failures while maintaining money correctness.

## 1. Failure Matrix

| Component | Failure Mode | Impact | Recovery Strategy |
| :--- | :--- | :--- | :--- |
| **CockroachDB** | Node Crash | **None**. Write API continues. | **Raft Consensus**. CockroachDB automatically rebalances range leases to healthy nodes. 3-node cluster tolerates 1 failure. |
| **Read Processor** | Service Crash | **Minor**. Read API becomes stale. | **NATS Consumer Groups**. When the processor restarts, it resumes from the last acknowledged JetStream sequence. |
| **PostgreSQL** | Database Down | **Major**. Read API unavailable. | **Cache/Degraded**. Query API can serve from Redis cache (if configured) or return 503. Writes are unaffected. |
| **Write API** | Network Partition | **Major**. Cannot transact. | **Client Retry**. Idempotency keys ensure retries don't cause double-spending. |

---

## 2. Deep Dive: The "Offline" Processor
What happens if the `Read Processor` crashes for 1 hour?

1.  **Writes Continue**: Users can still Deposit/Withdraw because the Write API talks to CockroachDB (Event Store).
2.  **Lag Accumulates**: The `ReadDB` (Postgres) shows 1 hour old balances.
3.  **Recovery**:
    *   Processor restarts.
    *   Connects to NATS JetStream.
    *   Sees "Last Processed: Seq 1000".
    *   NATS says "Current Head: Seq 5000".
    *   Processor consumes 4000 events rapidly to catch up.
    *   **Result**: System becomes consistent.

---

## 3. Resilience Testing

### Test 1: Kill the Processor
1.  Run `npm run dev:ledger` (Write API) only.
2.  Make 10 Deposits.
3.  Start `npm run dev:processor`.
4.  **Expectation**: You see 10 "Processed Event" logs instantly appearing as it catches up.

### Test 2: Double Spend Attack (Concurrency)
1.  Balance: $100.
2.  Send two `Withdraw($100)` requests simultaneously.
3.  **Expectation**:
    *   Req 1: Success (Version 1 -> 2).
    *   Req 2: **Fail** (Optimistic Lock Error: Expected v1, Found v2).
4.  **Result**: Balance stays > $0.
