import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Separate pool for CockroachDB (Event Store)
const pool = new Pool({
    connectionString: process.env.COCKROACH_URL,
    // SSL is disabled in connection string for dev
});

pool.on('error', (err) => {
    console.error('Unexpected error on event store client', err);
});

export const queryEvents = async (text: string, params?: any[]) => {
    const res = await pool.query(text, params);
    return res;
};
