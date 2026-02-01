
const fetch = require('node-fetch'); // Needs node-fetch installed or use built-in in Node 18+

const LEDGER_URL = 'http://localhost:4002';
const QUERY_URL = 'http://localhost:4001';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log("🧪 Starting End-to-End Verification...\n");

    const acc1 = `USER-${Date.now()}-A`;
    const acc2 = `USER-${Date.now()}-B`;

    // 1. Create Accounts
    console.log(`1️⃣ Creating Accounts...`);
    await post(`${LEDGER_URL}/commands/create-account`, { account_id: acc1, owner_name: "Alice", initial_balance: 0, currency: "USD" });
    await post(`${LEDGER_URL}/commands/create-account`, { account_id: acc2, owner_name: "Bob", initial_balance: 0, currency: "USD" });
    console.log(`   ✅ Created ${acc1} and ${acc2}`);

    await sleep(1000); // Allow for eventual consistency

    // 2. Deposit Funds (New Endpoint)
    console.log(`\n2️⃣ Testing Deposit Endpoint...`);
    await post(`${LEDGER_URL}/commands/deposit`, { account_id: acc1, amount: 1000, description: "Salary" });
    console.log(`   ✅ Deposited $1000 to ${acc1}`);

    await sleep(1000);

    // Save timestamp for Time Travel test later
    const timeBeforeTransfer = new Date().toISOString();
    console.log(`   🕒 Snapshot Taken: ${timeBeforeTransfer}`);

    await sleep(1000);

    // 3. Transfer Funds
    console.log(`\n3️⃣ Testing Transfer...`);
    await post(`${LEDGER_URL}/commands/transfer`, { from_account_id: acc1, to_account_id: acc2, amount: 300, description: "Rent" });
    console.log(`   ✅ Transferred $300 from ${acc1} to ${acc2}`);

    await sleep(1000);

    // 4. Withdraw Funds (New Endpoint)
    console.log(`\n4️⃣ Testing Withdraw Endpoint...`);
    await post(`${LEDGER_URL}/commands/withdraw`, { account_id: acc2, amount: 50, description: "Groceries" });
    console.log(`   ✅ Withdrew $50 from ${acc2}`);

    await sleep(2000); // Wait for Read Processor

    // 5. Verify Current State (Query API)
    console.log(`\n5️⃣ Verifying Current State...`);
    const balance1 = await get(`${QUERY_URL}/accounts/${acc1}`);
    const balance2 = await get(`${QUERY_URL}/accounts/${acc2}`);

    console.log(`   Expected ${acc1}: 700.00 | Actual: ${balance1.balance}`);
    console.log(`   Expected ${acc2}: 250.00 | Actual: ${balance2.balance}`);

    // 6. Verify Time-Travel (New Feature)
    console.log(`\n6️⃣ Testing Time-Travel Query...`);
    const pastBalance = await get(`${QUERY_URL}/accounts/${acc1}/balance-at?timestamp=${timeBeforeTransfer}`);
    console.log(`   Asking: Balance of ${acc1} at snapshot time?`);
    console.log(`   Actual Response: $${pastBalance.balance}`);

    if (parseFloat(pastBalance.balance) === 1000) {
        console.log(`   ✅ SUCCESS! Time-travel query returned correct past balance ($1000)`);
    } else {
        console.log(`   ❌ FAILED! Expected $1000, got $${pastBalance.balance}`);
    }

    // 7. Check Audit Logs
    console.log(`\n7️⃣ Checking Audit Logs (Event Store)...`);
    const events = await get(`${QUERY_URL}/events?limit=10`);
    const found = events.events.filter(e => e.aggregate_id === acc1 || e.aggregate_id === acc2);
    console.log(`   Found ${found.length} events for these accounts in the immutable log.`);
    found.forEach(e => console.log(`   - ${e.event_type} (${e.aggregate_id})`));

}

async function post(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

async function get(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

runTest().catch(console.error);
