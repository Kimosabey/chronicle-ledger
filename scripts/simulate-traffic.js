/**
 * Chronicle Ledger - Continuous Traffic Simulation
 * 
 * Simulates realistic banking activity:
 * - Account creation
 * - Deposits and withdrawals
 * - Transfers between accounts
 * - Continuous load generation
 */

const LEDGER_API = 'http://localhost:4002';
const QUERY_API = 'http://localhost:4001';

// Simulation configuration
const CONFIG = {
    accountCount: 10,
    transactionsPerMinute: 60,
    durationMinutes: 5, // 0 for infinite
    initialBalance: { min: 1000, max: 10000 }
};

const accounts = [];
let totalOperations = 0;
let successCount = 0;
let errorCount = 0;

// Helper functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomAmount = () => randomInt(10, 500);

const randomAccount = () => accounts[randomInt(0, accounts.length - 1)];

const logStats = () => {
    console.log(`\n📊 Statistics:`);
    console.log(`   Total Operations: ${totalOperations}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   Success Rate: ${((successCount / totalOperations) * 100).toFixed(2)}%`);
};

// API calls
const createAccount = async (accountId, ownerName, initialBalance) => {
    try {
        const response = await fetch(`${LEDGER_API}/commands/create-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: accountId, owner_name: ownerName, initial_balance: initialBalance, currency: 'USD' })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        console.log(`✅ Created account ${accountId} with $${initialBalance}`);
        return data;
    } catch (err) {
        console.error(`❌ Failed to create account ${accountId}: ${err.message}`);
        throw err;
    }
};

const deposit = async (accountId, amount, description) => {
    try {
        const response = await fetch(`${LEDGER_API}/commands/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: accountId, amount, description })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        console.log(`💰 Deposited $${amount} to ${accountId}`);
        return await response.json();
    } catch (err) {
        console.error(`❌ Deposit failed: ${err.message}`);
        throw err;
    }
};

const withdraw = async (accountId, amount, description) => {
    try {
        const response = await fetch(`${LEDGER_API}/commands/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: accountId, amount, description })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        console.log(`💸 Withdrew $${amount} from ${accountId}`);
        return await response.json();
    } catch (err) {
        console.log(`⚠️  Withdrawal failed: ${err.message}`);
        throw err;
    }
};

const transfer = async (from, to, amount) => {
    try {
        const response = await fetch(`${LEDGER_API}/commands/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_account_id: from, to_account_id: to, amount, description: 'Simulated transfer' })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        console.log(`🔄 Transferred $${amount} from ${from} to ${to}`);
        return await response.json();
    } catch (err) {
        console.log(`⚠️  Transfer failed: ${err.message}`);
        throw err;
    }
};

const getBalance = async (accountId) => {
    try {
        const response = await fetch(`${QUERY_API}/accounts/${accountId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return parseFloat(data.balance);
    } catch (err) {
        console.error(`❌ Failed to get balance for ${accountId}: ${err.message}`);
        return 0;
    }
};

// Simulation steps
const setupAccounts = async () => {
    console.log(`\n🏦 Setting up ${CONFIG.accountCount} accounts...\n`);

    for (let i = 1; i <= CONFIG.accountCount; i++) {
        const accountId = `SIM-ACC-${String(i).padStart(3, '0')}`;
        const ownerName = `Test User ${i}`;
        const initialBalance = randomInt(CONFIG.initialBalance.min, CONFIG.initialBalance.max);

        try {
            await createAccount(accountId, ownerName, initialBalance);
            accounts.push(accountId);
            totalOperations++;
            successCount++;
        } catch (err) {
            totalOperations++;
            errorCount++;
        }

        await delay(100); // Small delay between account creations
    }

    console.log(`\n✅ Created ${accounts.length} accounts\n`);
};

const simulateTransaction = async () => {
    const operations = ['deposit', 'withdraw', 'transfer'];
    const operation = operations[randomInt(0, operations.length - 1)];

    totalOperations++;

    try {
        switch (operation) {
            case 'deposit':
                await deposit(randomAccount(), randomAmount(), 'Simulated deposit');
                successCount++;
                break;

            case 'withdraw':
                const withdrawAccount = randomAccount();
                const withdrawAmount = randomAmount();
                const balance = await getBalance(withdrawAccount);

                if (balance >= withdrawAmount) {
                    await withdraw(withdrawAccount, withdrawAmount, 'Simulated withdrawal');
                    successCount++;
                } else {
                    console.log(`⚠️  Skipping withdrawal - insufficient funds`);
                    errorCount++;
                }
                break;

            case 'transfer':
                let fromAccount, toAccount;
                do {
                    fromAccount = randomAccount();
                    toAccount = randomAccount();
                } while (fromAccount === toAccount);

                const transferAmount = randomAmount();
                const fromBalance = await getBalance(fromAccount);

                if (fromBalance >= transferAmount) {
                    await transfer(fromAccount, toAccount, transferAmount);
                    successCount++;
                } else {
                    console.log(`⚠️  Skipping transfer - insufficient funds`);
                    errorCount++;
                }
                break;
        }
    } catch (err) {
        errorCount++;
    }
};

const runSimulation = async () => {
    console.log(`\n🚀 Starting Chronicle Ledger Traffic Simulation\n`);
    console.log(`Configuration:`);
    console.log(`  - Accounts: ${CONFIG.accountCount}`);
    console.log(`  - Transactions/min: ${CONFIG.transactionsPerMinute}`);
    console.log(`  - Duration: ${CONFIG.durationMinutes === 0 ? 'Continuous' : `${CONFIG.durationMinutes} minutes`}\n`);

    // Setup phase
    await setupAccounts();

    // Simulate traffic
    const intervalMs = (60 / CONFIG.transactionsPerMinute) * 1000;
    const endTime = CONFIG.durationMinutes === 0 ? Infinity : Date.now() + (CONFIG.durationMinutes * 60 * 1000);

    console.log(`\n🔄 Generating traffic... (Ctrl+C to stop)\n`);

    let statsInterval = setInterval(logStats, 10000); // Print stats every 10 seconds

    while (Date.now() < endTime) {
        await simulateTransaction();
        await delay(intervalMs);
    }

    clearInterval(statsInterval);

    console.log(`\n✅ Simulation complete!\n`);
    logStats();
};

// Start simulation
runSimulation().catch(err => {
    console.error(`\n❌ Simulation error: ${err.message}\n`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(`\n\n⏹ Simulation stopped by user\n`);
    logStats();
    process.exit(0);
});
