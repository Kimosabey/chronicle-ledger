import { connectNats, subscribe } from './nats';
import { query } from './db';

// Unified Event Processor (Idempotent by Design)
const processEvent = async (event: any) => {
    const { event_type, aggregate_id, event_data, event_id, created_at } = event;
    const data = event_data;

    try {
        console.log(`[Processing] ${event_type}: ${event_id}`);

        if (event_type === 'AccountCreated') {
            await query(
                `INSERT INTO account_balance (account_id, owner_name, balance, currency, status)
                 VALUES ($1, $2, $3, $4, 'active')
                 ON CONFLICT (account_id) DO NOTHING`,
                [data.account_id, data.owner_name, data.initial_balance, data.currency]
            );
        }
        else if (event_type === 'MoneyDeposited') {
            // Update Balance
            await query(
                `UPDATE account_balance SET balance = balance + $1, last_updated = NOW() WHERE account_id = $2`,
                [data.amount, aggregate_id]
            );

            // Record Transaction (Idempotent by event_id)
            await query(
                `INSERT INTO transactions (transaction_id, account_id, type, amount, balance_after, description, timestamp)
                 SELECT $1::uuid, $2::varchar, 'deposit', $3::decimal, balance, $4::text, $5::timestamptz
                 FROM account_balance WHERE account_id = $2::varchar
                 ON CONFLICT (transaction_id) DO NOTHING`,
                [event_id, aggregate_id, data.amount, data.description || 'Deposit', created_at]
            );

            if (data.transfer_id && data.sender) {
                await query(
                    `INSERT INTO transfers (transfer_id, from_account_id, to_account_id, amount, description, status, timestamp)
                     VALUES ($1::uuid, $2::varchar, $3::varchar, $4::decimal, $5::text, 'completed', $6::timestamptz)
                     ON CONFLICT (transfer_id) DO NOTHING`,
                    [data.transfer_id, data.sender, aggregate_id, data.amount, data.description, created_at]
                );
            }
        }
        else if (event_type === 'MoneyWithdrawn') {
            // Update Balance
            await query(
                `UPDATE account_balance SET balance = balance - $1, last_updated = NOW() WHERE account_id = $2`,
                [data.amount, aggregate_id]
            );

            // Record Transaction
            await query(
                `INSERT INTO transactions (transaction_id, account_id, type, amount, balance_after, description, timestamp)
                 SELECT $1::uuid, $2::varchar, 'withdrawal', $3::decimal, balance, $4::text, $5::timestamptz
                 FROM account_balance WHERE account_id = $2::varchar
                 ON CONFLICT (transaction_id) DO NOTHING`,
                [event_id, aggregate_id, data.amount, data.description || 'Withdrawal', created_at]
            );

            if (data.transfer_id && data.recipient) {
                await query(
                    `INSERT INTO transfers (transfer_id, from_account_id, to_account_id, amount, description, status, timestamp)
                     VALUES ($1::uuid, $2::varchar, $3::varchar, $4::decimal, $5::text, 'completed', $6::timestamptz)
                     ON CONFLICT (transfer_id) DO NOTHING`,
                    [data.transfer_id, aggregate_id, data.recipient, data.amount, data.description, created_at]
                );
            }
        }

        // Mark as processed in local read-model store
        await query(
            'INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW()) ON CONFLICT (event_id) DO NOTHING',
            [event_id]
        );

    } catch (err) {
        console.error(`Error processing ${event_type} (${event_id}):`, err);
    }
};

// Catch-up phase: Replay all historical events
const catchUp = async () => {
    console.log("📜 Starting Event Catch-up...");

    // 1. Ensure tracking table exists
    await query(`
        CREATE TABLE IF NOT EXISTS processed_events (
            event_id UUID PRIMARY KEY,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Query all events from store (CockroachDB 'events' table)
    // We order by created_at and event_version to ensure causal ordering
    const result = await query('SELECT * FROM events ORDER BY created_at ASC, event_version ASC');

    for (const row of result.rows) {
        // Only process if not already in our local tracking table
        const check = await query('SELECT 1 FROM processed_events WHERE event_id = $1', [row.event_id]);
        if (check.rowCount === 0) {
            await processEvent(row);
        }
    }

    console.log(`✅ Catch-up complete. Processed ${result.rowCount} events.`);
};

const start = async () => {
    try {
        await connectNats();

        // 1. Run Replay Logic first
        await catchUp();

        // 2. Subscribe to Live Events
        subscribe('events.account.created', processEvent);
        subscribe('events.account.deposited', processEvent);
        subscribe('events.account.withdrawn', processEvent);

        console.log("🚀 Read Processor Service Operational");

    } catch (err) {
        console.error("Error starting Read Processor:", err);
    }
};

start();
