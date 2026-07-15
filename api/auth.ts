import { randomBytes, scryptSync, createHmac, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { publicQuery } from "./middleware";

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt)                                           */
/* ------------------------------------------------------------------ */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return computed.length === expected.length && timingSafeEqual(computed, expected);
}

/* ------------------------------------------------------------------ */
/* Session token (HMAC-signed, dependency-free)                        */
/* ------------------------------------------------------------------ */
const COOKIE_NAME = "nexus_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type SessionPayload = {
  uid: number;
  role: "admin" | "hr" | "employee";
  exp: number;
};

function secret(): string {
  return process.env.APP_SECRET || "nexus-hr-fallback-secret";
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionCookie(userId: number, role: SessionPayload["role"]): string {
  const token = sign({
    uid: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseSession(req: Request): SessionPayload | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verify(decodeURIComponent(match[1]));
}

/* ------------------------------------------------------------------ */
/* User loading & tRPC procedures                                      */
/* ------------------------------------------------------------------ */
export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  role: "admin" | "hr" | "employee";
  employeeId: number | null;
};

export async function loadUser(session: SessionPayload | null): Promise<SessionUser | null> {
  if (!session) return null;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.uid)).limit(1);
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
  };
}

export const authedQuery = publicQuery.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Silakan login terlebih dahulu" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const managerQuery = authedQuery.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "hr") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Akses hanya untuk Admin / HR" });
  }
  return next({ ctx });
});

export const adminQuery = authedQuery.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Akses hanya untuk Admin" });
  }
  return next({ ctx });
});
