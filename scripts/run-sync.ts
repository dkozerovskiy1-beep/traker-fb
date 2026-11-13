import { executeSync } from "../app/lib/sync";

async function main() {
  console.log(`[${new Date().toISOString()}] 🚀 Starting standalone sync via GitHub Actions...`);

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: Missing DATABASE_URL environment variable!");
    console.error("Please add DATABASE_URL to your GitHub Repository Secrets:");
    console.error("GitHub Repo -> Settings -> Secrets and variables -> Actions -> New repository secret");
    process.exit(1);
  }

  const days = process.env.SYNC_DAYS ? parseInt(process.env.SYNC_DAYS) : 3;
  const skipComments = process.env.SKIP_COMMENTS === "true";

  const result = await executeSync({
    daysToSync: days,
    skipComments
  });

  console.log(`[${new Date().toISOString()}] ✅ Sync completed:`, JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] ❌ Sync failed:`, err);
  process.exit(1);
});
