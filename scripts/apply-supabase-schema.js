require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Set DIRECT_URL or DATABASE_URL before applying the Supabase schema.");
  }

  const sql = fs.readFileSync(path.join(process.cwd(), "supabase.schema.sql"), "utf8");
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Supabase schema applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
