import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db } from "./client";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
