
const { Client } = require('pg');

async function verify() {
    console.log("🔍 Verifying Consistency between Postgres (Read) and CockroachDB (Write)...");

    // 1. Get total events count from CockroachDB
    const cockroach = new Client({
        connectionString: 'postgresql://root@localhost:26257/chronicle?sslmode=disable'
    });

    // 2. Get total transactions from Postgres
    const postgres = new Client({
        connectionString: 'postgresql://chronicle:chronicle@localhost:5433/chronicle'
    });

    try {
        await cockroach.connect();
        await postgres.connect();

        const crRes = await cockroach.query("SELECT COUNT(*) FROM events WHERE event_type IN ('MoneyDeposited', 'MoneyWithdrawn')");
        const crCount = parseInt(crRes.rows[0].count);

        const pgRes = await postgres.query("SELECT COUNT(*) FROM transactions");
        const pgCount = parseInt(pgRes.rows[0].count);

        console.log(`\nCockroachDB (Events): ${crCount}`);
        console.log(`PostgreSQL (Transactions): ${pgCount}`);

        if (crCount === pgCount) {
            console.log("\n✅ Systems are CONSISTENT!");
        } else {
            console.log("\n⚠️ Systems are INCONSISTENT!");
            console.log(`Difference: ${Math.abs(crCount - pgCount)}`);
            console.log("Note: Small lag is expected in eventual consistency systems.");
        }

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await cockroach.end();
        await postgres.end();
    }
}

// We need 'pg' package for this script. 
// Run: npm install pg --save-dev
verify();
