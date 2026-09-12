import { Pool } from "pg";

/**
 * Works against the local docker-compose Postgres during the hackathon,
 * or a Supabase connection string (DATABASE_URL) once one is provisioned —
 * see .env.example.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
