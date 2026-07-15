import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { env } from "../lib/env.js";
import * as schema from "../../db/schema.js";
import * as relations from "../../db/relations.js";

const fullSchema = { ...schema, ...relations };

let instance: any;

export function getDb() {
  if (!instance) {
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
  return instance as ReturnType<typeof drizzle<typeof fullSchema>>;
}
