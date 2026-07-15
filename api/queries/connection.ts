import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

type DbInstance = ReturnType<typeof drizzle<typeof fullSchema>>;
let instance: DbInstance | undefined;

export function getDb(): DbInstance {
  if (!instance) {
    // Parse URL and strip the ?ssl=... query string (TiDB uses ssl option separately)
    const rawUrl = env.databaseUrl;
    const cleanUrl = rawUrl.split("?")[0];

    const pool = mysql.createPool({
      uri: cleanUrl,
      ssl: {
        rejectUnauthorized: true,
      },
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });

    instance = drizzle(pool, {
      schema: fullSchema,
      mode: "default",
    });
  }
  return instance;
}
