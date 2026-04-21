import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): {
  ctx: TrpcContext;
  clearedCookies: Array<{ name: string; options: Record<string, unknown> }>;
} {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@handoff.ai",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("returns the authenticated user from auth.me", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).not.toBeNull();
    expect(user?.email).toBe("test@handoff.ai");
    expect(user?.name).toBe("Test User");
  });

  it("returns null for unauthenticated user from auth.me", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

// ─── Agent Phase Names ────────────────────────────────────────────────────────

describe("agent.phaseNames", () => {
  it("returns exactly 7 phases in the correct order", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    const phases = await caller.agent.phaseNames();

    expect(phases).toHaveLength(7);
    expect(phases[0]).toBe("Analizar");
    expect(phases[1]).toBe("Pensar");
    expect(phases[2]).toBe("Seleccionar");
    expect(phases[3]).toBe("Ejecutar");
    expect(phases[4]).toBe("Observar");
    expect(phases[5]).toBe("Iterar");
    expect(phases[6]).toBe("Entregar");
  });
});

// ─── Tasks Router (auth guard) ────────────────────────────────────────────────

describe("tasks router auth guard", () => {
  it("throws UNAUTHORIZED when listing tasks without auth", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tasks.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws UNAUTHORIZED when creating a task without auth", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tasks.create({ title: "Test task" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED when getting a task without auth", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tasks.get({ taskId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Memory Router (auth guard) ───────────────────────────────────────────────

describe("memory router auth guard", () => {
  it("throws UNAUTHORIZED when accessing memory without auth", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memory.getAll({ taskId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Chat Router (auth guard) ─────────────────────────────────────────────────

describe("chat router auth guard", () => {
  it("throws UNAUTHORIZED when sending a message without auth", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.sendMessage({ taskId: 1, message: "Hello" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Errors Router (auth guard) ───────────────────────────────────────────────

describe("errors router auth guard", () => {
  it("throws UNAUTHORIZED when listing errors without auth", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.errors.list({ taskId: 1 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Sessions Router (auth guard) ─────────────────────────────────────────────

describe("sessions router auth guard", () => {
  it("throws UNAUTHORIZED when listing sessions without auth", async () => {
    const ctx = createAnonContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sessions.listByUser()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─── Input Validation ─────────────────────────────────────────────────────────

describe("input validation", () => {
  it("rejects task creation with empty title", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tasks.create({ title: "" })
    ).rejects.toThrow();
  });

  it("rejects chat message with empty content", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.chat.sendMessage({ taskId: 1, message: "" })
    ).rejects.toThrow();
  });

  it("rejects memory update with invalid fileType", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memory.updateFile({
        taskId: 1,
        fileType: "invalid" as any,
        content: "test",
      })
    ).rejects.toThrow();
  });
});
