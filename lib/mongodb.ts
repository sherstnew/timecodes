import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "";

if (!uri) {
    throw new Error("MONGODB_URI is not set in environment");
}

let cached: { client: MongoClient | null } = (global as any)._mongoClientCache || { client: null };

if (!cached.client) {
    cached.client = new MongoClient(uri);
    (global as any)._mongoClientCache = cached;
}

export async function getDb() {
    const client = cached.client as MongoClient;
    if (!client.isConnected?.()) {
        await client.connect();
    }
    return client.db();
}

export async function getCollection(name: string) {
    const db = await getDb();
    return db.collection(name);
}
