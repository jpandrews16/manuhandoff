import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const DEFAULT_USER: User = {
  id: 1,
  openId: "default",
  name: "Admin",
  email: "admin@handoff.local",
  passwordHash: null,
  loginMethod: "none",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

async function getOrCreateDefaultUser(): Promise<User> {
  try {
    const db = await getDb();
    if (!db) return DEFAULT_USER;
    const existing = await db.select().from(users).limit(1);
    if (existing[0]) return existing[0] as User;
    await db.insert(users).values({
      openId: "default",
      name: "Admin",
      email: "admin@handoff.local",
      loginMethod: "none",
      role: "admin",
      lastSignedIn: new Date(),
    });
    const created = await db.select().from(users).limit(1);
    return (created[0] as User) ?? DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user = await getOrCreateDefaultUser();
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
