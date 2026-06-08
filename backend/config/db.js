/*
 MongoDB connection. Call connectDB() once at startup, then getDB() whenever you need to access the database.
 */

import { MongoClient } from "mongodb";
import { MONGO_URI, DB_NAME } from "./config.js";

let db;

export async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅  Connected to MongoDB → "${DB_NAME}"`);
}

/*
 Returns the connected Db instance.
 Throws if called before connectDB() has resolved.
 */
export function getDB() {
  if (!db) throw new Error("Database not initialised — call connectDB() first.");
  return db;
}