import { initializeAppData } from "./bootstrap";

async function main() {
  await initializeAppData();
  console.log("Untap database initialized.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
