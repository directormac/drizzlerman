import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schemas/user";
import * as userSchema from "./schemas/user";
const sqlite = new Database("sqlite.db");

export const db = drizzle(sqlite, {
  schema: { ...userSchema },
});

// migrate(db, { migrationsFolder: "migrations" });
