/**
 * api/index.ts — Vercel Serverless Function Entry Point
 *
 * This file is the ONLY entry point in the `api/` directory.
 * Vercel treats all files in `api/` as separate Serverless Functions.
 * By moving the rest of the backend to `server/`, we stay within Vercel's 12-function limit (Hobby plan).
 */
import app from "../server/index.js";

export default app;
