import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { query } from './db';
import { queryEvents } from './eventStore';

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
    return { status: 'ok', service: 'query-api' };
});

fastify.get('/accounts/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
        const res = await query('SELECT * FROM account_balance WHERE account_id = $1', [id]);
        if (res.rowCount === 0) {
            return reply.status(404).send({ error: 'Account not found' });
        }
        return res.rows[0];
    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

fastify.get('/accounts/:id/transactions', async (request, reply) => {
    const { id } = request.params as any;
    try {
        const res = await query(
            'SELECT * FROM transactions WHERE account_id = $1 ORDER BY timestamp DESC LIMIT 50',
            [id]
        );
        return { account_id: id, transactions: res.rows, total: res.rowCount };
    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

fastify.get('/accounts/:id/balance-at', async (request, reply) => {
    const { id } = request.params as any;
    const { timestamp } = request.query as any;

    if (!timestamp) {
        return reply.status(400).send({ error: 'Timestamp is required (ISO 8601)' });
    }

    try {
        const res = await queryEvents(
            'SELECT event_type, event_data FROM events WHERE aggregate_id = $1 AND created_at <= $2 ORDER BY created_at ASC',
            [id, timestamp]
        );

        let balance = 0;
        let currency = 'USD';
        let exists = false;

        for (const row of res.rows) {
            exists = true;
            const data = row.event_data;
            // Handle different casing issues from JSON or DB if any, but standardizing on what we see in code
            if (row.event_type.includes('Created')) {
                balance = parseFloat(data.initial_balance);
                currency = data.currency;
            } else if (row.event_type.includes('Deposited')) {
                balance += parseFloat(data.amount);
            } else if (row.event_type.includes('Withdrawn')) {
                balance -= parseFloat(data.amount);
            }
        }

        if (!exists) {
            return reply.status(404).send({ error: 'Account did not exist at this time' });
        }

        return { account_id: id, balance: balance.toFixed(2), currency, at: timestamp };

    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

fastify.get('/events', async (request, reply) => {
    try {
        const { limit = 100 } = request.query as any;
        const res = await queryEvents(
            'SELECT * FROM events ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        return { events: res.rows, total: res.rowCount };
    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});


const start = async () => {
    try {
        const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4001;

        // Test DB connection
        await query('SELECT 1');
        console.log('Connected to PostgreSQL (Read Model)');

        await queryEvents('SELECT 1');
        console.log('Connected to CockroachDB (Event Store)');

        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Query Service listening on port ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
