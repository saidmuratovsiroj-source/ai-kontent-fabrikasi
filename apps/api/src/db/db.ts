import { Pool } from "pg";
import { env } from "../config/env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

export async function connectDb(): Promise<void> {
  const client = await pool.connect();
  client.release();
  console.log("PostgreSQL: ulanish muvaffaqiyatli");
}
