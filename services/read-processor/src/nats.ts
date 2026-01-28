import { connect, NatsConnection, StringCodec, JSONCodec } from 'nats';
import dotenv from 'dotenv';

dotenv.config();

let nc: NatsConnection;

export const connectNats = async () => {
    try {
        nc = await connect({ servers: process.env.NATS_URL });
        console.log(`Connected to NATS at ${nc.getServer()}`);
        return nc;
    } catch (err) {
        console.error(`Error connecting to NATS: ${err}`);
        throw err;
    }
};

export const getNats = () => {
    if (!nc) {
        throw new Error('NATS not connected. Call connectNats() first.');
    }
    return nc;
};

export const subscribe = (subject: string, callback: (data: any) => void) => {
    const jc = JSONCodec();
    const sub = nc.subscribe(subject);
    (async () => {
        for await (const m of sub) {
            try {
                const data = jc.decode(m.data);
                callback(data);
            } catch (err) {
                console.error(`Error processing message on ${subject}:`, err);
            }
        }
    })();
};
