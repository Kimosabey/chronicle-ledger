import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
// Touch trigger 2
import { connectNats, publishEvent } from './nats';
import { query } from './db';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const fastify = Fastify({
    logger: true
});

// Enable CORS
fastify.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true
});

fastify.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'ledger-api' };
});

fastify.post('/commands/create-account', async (request, reply) => {
    const { account_id, owner_name, initial_balance, currency } = request.body as any;

    // Basic Validation
    if (!account_id || !owner_name) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
        // 1. Check if account exists (using event store query or separate lookup)
        // For simple check, we can query proper aggregate table if we had one, 
        // or just check if any events exist for this aggregate (less efficient but works for MVP)
        // Ideally we check a "unique constraints" table.

        // 2. Create Event
        const eventId = uuidv4();
        const event = {
            event_id: eventId,
            aggregate_id: account_id,
            aggregate_type: 'Account',
            event_type: 'AccountCreated',
            event_data: { account_id, owner_name, initial_balance, currency },
            event_version: 1,
            created_at: new Date().toISOString(),
            created_by: 'system'
        };

        // 3. Write to CockroachDB
        await query(
            'INSERT INTO events (event_id, aggregate_id, aggregate_type, event_type, event_data, event_version) VALUES ($1, $2, $3, $4, $5, $6)',
            [event.event_id, event.aggregate_id, event.aggregate_type, event.event_type, event.event_data, event.event_version]
        );

        // 4. Publish to NATS
        await publishEvent('events.account.created', event);

        return reply.status(201).send({ success: true, event_id: eventId });

    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

fastify.post('/commands/transfer', async (request, reply) => {
    const { from_account_id, to_account_id, amount, description } = request.body as any;

    // Validation
    if (!from_account_id || !to_account_id || !amount) {
        return reply.status(400).send({ error: 'Missing required fields' });
    }

    if (from_account_id === to_account_id) {
        return reply.status(422).send({ error: 'Cannot transfer to same account' });
    }

    if (amount <= 0) {
        return reply.status(422).send({ error: 'Amount must be greater than 0' });
    }

    try {
        // Check sender's balance by replaying events (event sourcing approach)
        const eventsResult = await query(
            'SELECT event_type, event_data FROM events WHERE aggregate_id = $1 AND event_type IN ($2, $3, $4) ORDER BY created_at',
            [from_account_id, 'AccountCreated', 'MoneyDeposited', 'MoneyWithdrawn']
        );

        if (eventsResult.rowCount === 0) {
            return reply.status(404).send({ error: `Account ${from_account_id} not found` });
        }

        // Calculate current balance from events
        let currentBalance = 0;
        for (const row of eventsResult.rows) {
            const data = row.event_data;
            if (row.event_type === 'AccountCreated') {
                currentBalance = parseFloat(data.initial_balance);
            } else if (row.event_type === 'MoneyDeposited') {
                currentBalance += parseFloat(data.amount);
            } else if (row.event_type === 'MoneyWithdrawn') {
                currentBalance -= parseFloat(data.amount);
            }
        }

        // Check if sender has sufficient funds
        if (currentBalance < amount) {
            return reply.status(422).send({
                error: `Insufficient funds. Current balance: ${currentBalance.toFixed(2)}, Required: ${amount.toFixed(2)}`
            });
        }

        // Check if recipient account exists
        const recipientCheck = await query(
            'SELECT 1 FROM events WHERE aggregate_id = $1 AND event_type = $2 LIMIT 1',
            [to_account_id, 'AccountCreated']
        );

        if (recipientCheck.rowCount === 0) {
            return reply.status(404).send({ error: `Recipient account ${to_account_id} not found` });
        }

        const transferId = uuidv4();
        const timestamp = new Date().toISOString();

        // Create two events: withdrawal from sender, deposit to receiver
        const withdrawalEventId = uuidv4();
        const withdrawalEvent = {
            event_id: withdrawalEventId,
            aggregate_id: from_account_id,
            aggregate_type: 'Account',
            event_type: 'MoneyWithdrawn',
            event_data: {
                amount,
                description: description || `Transfer to ${to_account_id}`,
                transfer_id: transferId,
                recipient: to_account_id
            },
            event_version: 1,
            created_at: timestamp,
            created_by: 'system'
        };

        const depositEventId = uuidv4();
        const depositEvent = {
            event_id: depositEventId,
            aggregate_id: to_account_id,
            aggregate_type: 'Account',
            event_type: 'MoneyDeposited',
            event_data: {
                amount,
                description: description || `Transfer from ${from_account_id}`,
                transfer_id: transferId,
                sender: from_account_id
            },
            event_version: 1,
            created_at: timestamp,
            created_by: 'system'
        };

        // Write both events to CockroachDB (could use transaction here)
        await query(
            'INSERT INTO events (event_id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [withdrawalEvent.event_id, withdrawalEvent.aggregate_id, withdrawalEvent.aggregate_type, withdrawalEvent.event_type, withdrawalEvent.event_data, withdrawalEvent.event_version, withdrawalEvent.created_at]
        );

        await query(
            'INSERT INTO events (event_id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [depositEvent.event_id, depositEvent.aggregate_id, depositEvent.aggregate_type, depositEvent.event_type, depositEvent.event_data, depositEvent.event_version, depositEvent.created_at]
        );

        // Publish to NATS
        await publishEvent('events.account.withdrawn', withdrawalEvent);
        await publishEvent('events.account.deposited', depositEvent);

        return reply.status(201).send({
            success: true,
            transfer_id: transferId,
            events: [
                { event_id: withdrawalEventId, type: 'MoneyWithdrawn' },
                { event_id: depositEventId, type: 'MoneyDeposited' }
            ]
        });

    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

fastify.post('/commands/deposit', async (request, reply) => {
    const { account_id, amount, description } = request.body as any;

    if (!account_id || !amount || amount <= 0) {
        return reply.status(400).send({ error: 'Invalid input. Amount must be positive.' });
    }

    try {
        // Check if account exists
        const accountCheck = await query(
            'SELECT 1 FROM events WHERE aggregate_id = $1 AND event_type = $2 LIMIT 1',
            [account_id, 'AccountCreated']
        );

        if (accountCheck.rowCount === 0) {
            return reply.status(404).send({ error: 'Account not found' });
        }

        const eventId = uuidv4();
        const event = {
            event_id: eventId,
            aggregate_id: account_id,
            aggregate_type: 'Account',
            event_type: 'MoneyDeposited',
            event_data: {
                amount,
                description: description || 'Deposit',
            },
            event_version: 1,
            created_at: new Date().toISOString(),
            created_by: 'system'
        };

        await query(
            'INSERT INTO events (event_id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [event.event_id, event.aggregate_id, event.aggregate_type, event.event_type, event.event_data, event.event_version, event.created_at]
        );

        await publishEvent('events.account.deposited', event);

        return reply.status(201).send({ success: true, event_id: eventId });
    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

fastify.post('/commands/withdraw', async (request, reply) => {
    const { account_id, amount, description } = request.body as any;

    if (!account_id || !amount || amount <= 0) {
        return reply.status(400).send({ error: 'Invalid input. Amount must be positive.' });
    }

    try {
        // Check balance
        const eventsResult = await query(
            'SELECT event_type, event_data FROM events WHERE aggregate_id = $1 AND event_type IN ($2, $3, $4) ORDER BY created_at',
            [account_id, 'AccountCreated', 'MoneyDeposited', 'MoneyWithdrawn']
        );

        if (eventsResult.rowCount === 0) {
            return reply.status(404).send({ error: 'Account not found' });
        }

        let currentBalance = 0;
        for (const row of eventsResult.rows) {
            const data = row.event_data;
            if (row.event_type === 'AccountCreated') {
                currentBalance = parseFloat(data.initial_balance);
            } else if (row.event_type === 'MoneyDeposited') {
                currentBalance += parseFloat(data.amount);
            } else if (row.event_type === 'MoneyWithdrawn') {
                currentBalance -= parseFloat(data.amount);
            }
        }

        if (currentBalance < amount) {
            return reply.status(422).send({
                error: `Insufficient funds. Current balance: ${currentBalance.toFixed(2)}, Required: ${amount.toFixed(2)}`
            });
        }

        const eventId = uuidv4();
        const event = {
            event_id: eventId,
            aggregate_id: account_id,
            aggregate_type: 'Account',
            event_type: 'MoneyWithdrawn',
            event_data: {
                amount,
                description: description || 'Withdrawal',
            },
            event_version: 1,
            created_at: new Date().toISOString(),
            created_by: 'system'
        };

        await query(
            'INSERT INTO events (event_id, aggregate_id, aggregate_type, event_type, event_data, event_version, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [event.event_id, event.aggregate_id, event.aggregate_type, event.event_type, event.event_data, event.event_version, event.created_at]
        );

        await publishEvent('events.account.withdrawn', event);

        return reply.status(201).send({ success: true, event_id: eventId });
    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

const start = async () => {
    try {
        const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

        // Connect to NATS
        await connectNats();

        // Connect to DB (Pool connects on first query, but good to check)
        await query('SELECT 1');
        console.log('Connected to CockroachDB');

        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Server listening on port ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
