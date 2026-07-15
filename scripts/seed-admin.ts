/**
 * scripts/seed-admin.ts
 *
 * Creates the initial admin account if it doesn't exist.
 * Run: npm run seed
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { randomBytes, scryptSync } from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Please check your .env file.");
  process.exit(1);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const cleanUrl = DATABASE_URL!.split("?")[0];

  const conn = await mysql.createConnection({
    uri: cleanUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    console.log("🔌 Connecting to database...");

    // Check if admin already exists
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      ["admin"],
    );

    if (rows.length > 0) {
      console.log("✅ Admin account already exists. Skipping seed.");
      return;
    }

    const passwordHash = hashPassword("Admin@2024");

    await conn.execute(
      `INSERT INTO users (username, password_hash, full_name, email, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      ["admin", passwordHash, "Administrator", "admin@company.com", "admin", true],
    );

    console.log("✅ Admin account created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Username : admin");
    console.log("  Password : Admin@2024");
    console.log("  Role     : Administrator");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  IMPORTANT: Change the password after first login!");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
