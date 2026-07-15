import { getDb } from "./server/queries/connection.js";

async function run() {
  console.log("Altering candidates table...");
  await getDb().execute('ALTER TABLE candidates ADD COLUMN cv_file_base64 mediumtext');
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
