# Chronicle Ledger

![Thumbnail](docs/assets/thumbnail.png)

## Modern Event-Sourced Banking System

<div align="center">

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Pattern](https://img.shields.io/badge/Pattern-CQRS_Event_Sourcing-6933FF?style=for-the-badge)

</div>

**Chronicle Ledger** is a financial auditing system that prioritizes data integrity above all else. By using **Event Sourcing**, it ensures that no financial data is ever overwritten or lost. It implements **CQRS** to separate high-throughput writes (CockroachDB) from fast reads (PostgreSQL), bridged by **NATS JetStream**.

---

## 🚀 Quick Start

Run the entire cluster in 2 steps:

```bash
# 1. Start Infrastructure
docker-compose up -d

# 2. Start Services (Write API, Read Processor, Query API, UI)
npm install && npm run dev
```

> **Important**: First run requires DB initialization. See [GETTING_STARTED.md](./docs/GETTING_STARTED.md).

---

## 📸 Demo & Architecture

### Real-Time Dashboard
![Dashboard](docs/assets/dashboard.png)
*Live Event Log and Account Materialization*

### System Architecture
![Architecture](docs/assets/architecture.png)
*Write Side (Event Store) -> Async Bus -> Read Side (Projected View)*

### Time-Travel Debugging (Unique Feature)
![Time Travel](docs/assets/hero_main.png)
*Querying the exact state of an account at any historical timestamp.*

> **Deep Dive**: See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the Event Schema and Causal Consistency.

---

## ✨ Key Features

*   **📜 Immutable Event Log**: Uses **CockroachDB** to store append-only financial events.
*   **⚡ CQRS Pattern**: Separates Write/Read concerns.
    ![CQRS Pattern](docs/assets/architecture.png)
*   **⏰ Time-Travel Queries**: "What was the balance at 2:00 PM yesterday?"
*   **🛡️ Double-Spend Protection**: Strict Optimistic Concurrency Control (OCC).

---

## 🏗️ The Data Journey

Understanding how a single click becomes an immutable record:

![Data Journey](docs/assets/workflow.png)

1.  **Command**: User requests "Deposit $100".
2.  **Validation**: API checks current version.
3.  **Event Store**: Event appended to CockroachDB.
4.  **Propagate**: NATS delivers event to Processors.
5.  **Project**: PostgreSQL View updated.

---

## 📚 Documentation

| Document | Description |
| :--- | :--- |
| [**System Architecture**](./docs/ARCHITECTURE.md) | Event Schemas, CQRS Design, and Decision Log. |
| [**Getting Started**](./docs/GETTING_STARTED.md) | Docker setup, DB init, and test scripts. |
| [**Failure Scenarios**](./docs/FAILURE_SCENARIOS.md) | Handling "Offline Processors" and Partitioning. |
| [**Interview Q&A**](./docs/INTERVIEW_QA.md) | "Why Event Sourcing?" and "Why CockroachDB?". |

---

## 🔧 Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Write Store** | **CockroachDB** | Distributed Immutable Log. |
| **Read Store** | **PostgreSQL** | Materialized Views. |
| **Messaging** | **NATS JetStream** | Async Event Bus. |
| **Frontend** | **Next.js 14** | Real-time Audit Dashboard. |

---

## 👤 Author

**Harshan Aiyappa**  
Senior Full-Stack Hybrid Engineer  
[GitHub Profile](https://github.com/Kimosabey)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
