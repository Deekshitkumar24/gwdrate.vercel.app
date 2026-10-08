import { MongoClient, Db } from "mongodb";
import type { DatabaseState } from "./index";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const STATE_DOC_ID = "current_event_state";

export function isMongoEnabled(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export function getMongoClientPromise(): Promise<MongoClient> | null {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }
}

export async function getMongoDb(): Promise<Db | null> {
  const promise = getMongoClientPromise();
  if (!promise) return null;
  try {
    const client = await promise;
    return client.db("gwdrating");
  } catch (err) {
    console.error("Failed to connect to MongoDB cluster:", err);
    return null;
  }
}

export async function loadStateFromMongo(): Promise<DatabaseState | null> {
  try {
    const db = await getMongoDb();
    if (!db) return null;
    const collection = db.collection("app_state");
    const doc = await collection.findOne({ _id: STATE_DOC_ID as any });
    if (!doc) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, ...state } = doc;
    return state as unknown as DatabaseState;
  } catch (error) {
    console.error("Error loading state from MongoDB:", error);
    return null;
  }
}

export async function saveStateToMongo(state: DatabaseState): Promise<void> {
  try {
    const db = await getMongoDb();
    if (!db) return;
    const collection = db.collection("app_state");
    await collection.replaceOne(
      { _id: STATE_DOC_ID as any },
      { _id: STATE_DOC_ID as any, ...state },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error persisting state to MongoDB:", error);
  }
}
