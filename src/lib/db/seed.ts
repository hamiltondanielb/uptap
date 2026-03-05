import { initializeAppData } from "./bootstrap";

async function main() {
  await initializeAppData();
  console.log("Untap demo data ensured.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
