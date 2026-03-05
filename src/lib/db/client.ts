import path from "node:path";
import { mkdirSync } from "node:fs";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/lib/db/schema";

const databaseFile = process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "untap.db");

mkdirSync(path.dirname(databaseFile), { recursive: true });

const sqlite = new Database(databaseFile);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite, databaseFile };

