import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { parseSession, loadUser, type SessionUser } from "./auth.js";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: SessionUser | null;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const session = parseSession(opts.req);
  const user = await loadUser(session);
  return { req: opts.req, resHeaders: opts.resHeaders, user };
}
