import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * In-memory MongoDB for route/service integration tests.
 *
 * A replica set (`count: 1`) is required because M4's progress cascade uses
 * `session.withTransaction`, which Mongo only allows on a replica set. Starting
 * it here now also keeps the test suite entirely off the real Atlas cluster.
 */
let replset: MongoMemoryReplSet | undefined;

async function start(): Promise<void> {
  // Drop any connection a prior import may have opened (e.g. against Atlas).
  await mongoose.disconnect().catch(() => {});

  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replset.getUri();

  // Reset lib/db.ts's global connection cache so connectToDatabase() dials
  // the in-memory server instead of returning a stale handle.
  (globalThis as { _mongoose?: unknown })._mongoose = { conn: null, promise: null };
}

async function stop(): Promise<void> {
  await mongoose.disconnect().catch(() => {});
  (globalThis as { _mongoose?: unknown })._mongoose = undefined;
  if (replset) {
    await replset.stop();
    replset = undefined;
  }
}

export async function clearCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

/** Register the in-memory Mongo lifecycle for the calling test file. */
export function setupTestDb(): void {
  beforeAll(start, 120_000);
  afterAll(stop);
  afterEach(clearCollections);
}
