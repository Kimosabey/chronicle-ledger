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

export const publishEvent = async (subject: string, data: any) => {
    const jc = JSONCodec();
    nc.publish(subject, jc.encode(data));
};
