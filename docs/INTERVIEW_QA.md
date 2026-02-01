# 🎤 Interview Cheat Sheet: Chronicle Ledger

## 1. The Elevator Pitch (2 Minutes)

"Chronicle Ledger is a banking-grade ledger system built on **Event Sourcing** and **CQRS**.

Instead of storing just the current balance (like `$100`), I store every transaction (`+$50`, `-$20`) in an immutable **Append-Only Log** (CockroachDB).
This allows me to:
1.  **Time Travel**: Reconstruct the account state at any point in history.
2.  **Audit**: Prove exactly how a balance was reached.
3.  **Scale**: I separate Writes (CockroachDB) from Reads (PostgreSQL) using **CQRS**, connecting them via **NATS JetStream** for eventual consistency."

---

## 2. "Explain Like I'm 5" ( The Checkbook)

"Imagine a traditional database is like a whiteboard. When you spend $10, you erase `$100` and write `$90`. If you make a mistake, the old number is gone forever.

My system is like a **Checkbook Register**.
*   I *never* erase anything.
*   I only write lines: `Line 1: Deposit $100`. `Line 2: Spend $10`.
*   To know your balance, I just add up the lines.
*   If I want to know what you had yesterday, I just add up the lines *up to yesterday*.
*   It is impossible to 'lose' money because history is permanent."

---

## 3. Tough Technical Questions

### Q: Why Event Sourcing? Isn't it slow to replay events?
**A:** "Replaying 10,000 events every time you query a balance IS slow. That's why I use **CQRS**.
*   **Write Side**: Appends Event (Fast).
*   **Read Side**: A background worker listens to events and updates a 'Snapshot' table in PostgreSQL.
*   **Query**: The user reads from Postgres (Instant). Use the Event Log only for Audits or Time-Travel, not for daily balance checks."

### Q: How do you handle Concurrency (Double Spending)?
**A:** "I use **Optimistic Concurrency Control (OCC)** at the database level.
Every account has a `version` number.
*   User A tries to withdraw (expecting v1).
*   User B tries to withdraw (expecting v1).
*   CockroachDB allows only **one** write to succeed for key `(AccountID, v1)`. The second one fails with a constraints violation.
This guarantees strict consistency for writes, even in a distributed cluster."

### Q: Why CockroachDB?
**A:** "I needed a database that offers **Serializability** (ACID) but can scale horizontally. Postgres is great (I use it for reads), but scaling writes on Postgres is hard. CockroachDB gives me the consistency of SQL with the resilience of NoSQL (Raft Consensus)."
