import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://untap:untap@localhost:5432/untap";

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
