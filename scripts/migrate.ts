import pg from "pg";

process.env.SKIP_AUTO_MIGRATION = "1";

const { runMigrations } = await import("../database.js");

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");
}

const migrationPool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 10_000,
});

try {
  await runMigrations(migrationPool);
  console.log("Database migrations completed successfully.");
} finally {
  await migrationPool.end();
}
