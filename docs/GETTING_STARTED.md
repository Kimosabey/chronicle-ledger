# 🚀 Getting Started with Chronicle Ledger

> **Prerequisites**
> *   **Docker Desktop** (CockroachDB + Postgres + NATS)
> *   **Node.js v20+**
> *   **PowerShell** (optional, for scripts)

## 1. Environment Setup

**Backend (`.env`)**
The project uses a Monorepo structure. You likely don't need to touch `.env` files as defaults point to localhost.

---

## 2. Installation & Launch

### Step 1: Start Infrastructure
```bash
docker-compose up -d
# Waits for: CockroachDB (26257), Postgres (5432), NATS (4222)
```

### Step 2: Initialize Database (Critical)
We need to create the Event Store tables in CockroachDB.
```powershell
# Windows PowerShell
Get-Content infra/cockroach/init.sql | docker exec -i chronicle-cockroach ./cockroach sql --insecure

# Linux/Mac
cat infra/cockroach/init.sql | docker exec -i chronicle-cockroach ./cockroach sql --insecure
```

### Step 3: Start All Services
We use `concurrently` to run the 4 microservices (Write API, Read Processor, Query API, UI).
```bash
npm install
npm run dev
```

---

## 3. Usage Guide

### A. Access Interface
Go to **`http://localhost:3000`**.
*   **Event Log**: Watch new events stream in.
*   **Account View**: See materialized balances.

### B. Create an Account (CLI or UI)
You can use the API directly:
```bash
curl -X POST http://localhost:3001/accounts \
  -H "Content-Type: application/json" \
  -d '{"owner": "Alice", "currency": "USD"}'
```

---

## 4. Running Tests

### End-to-End Test Script
This script simulates a full user journey:
1.  Creates Account
2.  Deposits $100
3.  Withdraws $50
4.  Checks Balance ($50)
5.  Queries History

```bash
node scripts/e2e-test.js
```

### Consistency Verification
Checks if the *Read Model* (Postgres) matches the *Event Store* (CockroachDB).
```bash
node scripts/verify-consistency.js
```
