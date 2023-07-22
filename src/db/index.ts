import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config();

import * as userSchema from "./schemas/user";
const queryClient = postgres(process.env.DB_URL ?? "");
export const db = drizzle(queryClient, {
  schema: { ...userSchema },
});

// migrate(db, { migrationsFolder: "migrations" });
