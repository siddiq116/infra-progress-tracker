import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

dotenv.config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) before running migrations");
  }

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const client = new Client({ connectionString });

  await client.connect();
  try {
    await client.query(schema);
    console.log("Schema applied successfully.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
