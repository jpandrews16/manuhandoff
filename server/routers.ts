import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { sdk } from "./_core/sdk";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  AGENT_PHASES,
  addChatMessage,
  createSession,
  createTask,
  deleteTask,
  getErrorLogs,
  getChatMessages,
  getMemoryFile,
  getSessionsByTask,
  getSessionsByUser,
  getTaskById,
  getTaskMemory,
  getTaskPhases,
  getTasksByUser,
  getUserByEmail,
  logError,
  updateMemoryFile,
  updateTaskStatus,
  upsertUser,
} from "./db";
import {
  chatWithAgent,
  decomposeTaskIntoPhases,
  generateTaskPlan,
  runAgentLoop,
} from "./agent";
import { reasoningRouter } from "./reasoning-router";
import { analyticsRouter } from "./analytics-router";
import { multiFormatRouter } from "./multi-format-router";
import { parallelRouter } from "./parallel-router";
import { webhooksRouter } from "./webhooks-router";

// ─── Tasks Router ─────────────────────────────────────────────────────────────

const tasksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getTasksByUser(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return task;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(512),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const taskId = await createTask(ctx.user.id, input.title, input.description);

      // Decompose into phases using LLM
      const phaseNotes = await decomposeTaskIntoPhases(input.title, input.description);
      await generateTaskPlan(taskId, input.title, phaseNotes);

      // Update phase notes in DB
      const phases = await getTaskPhases(taskId);
      const { getDb } = await import("./db");
      const db = await getDb();
      if (db) {
        const { taskPhases } = await import("../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");
        for (let i = 0; i < phaseNotes.length; i++) {
          await db
            .update(taskPhases)
            .set({ notes: phaseNotes[i] })
            .where(and(eq(taskPhases.taskId, taskId), eq(taskPhases.phaseIndex, i)));
        }
      }

      // Create a session
      await createSession(ctx.user.id, taskId);

      return { taskId, phaseNotes };
    }),

  delete: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await deleteTask(input.taskId);
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        status: z.enum(["pending", "running", "paused", "completed", "error"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateTaskStatus(input.taskId, input.status);
      return { success: true };
    }),
});

// ─── Agent Router ─────────────────────────────────────────────────────────────

const agentRouter = router({
  getPhases: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getTaskPhases(input.taskId);
    }),

  startLoop: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (task.status === "running") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Task is already running" });
      }

      // Run async (non-blocking)
      runAgentLoop(input.taskId, ctx.user.id).catch(console.error);

      return { success: true, message: "Agent loop started" };
    }),

  phaseNames: publicProcedure.query(() => AGENT_PHASES),
});

// ─── Memory Router ────────────────────────────────────────────────────────────

const memoryRouter = router({
  getAll: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getTaskMemory(input.taskId);
    }),

  getFile: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        fileType: z.enum(["task_plan", "findings", "progress"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getMemoryFile(input.taskId, input.fileType);
    }),

  updateFile: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        fileType: z.enum(["task_plan", "findings", "progress"]),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateMemoryFile(input.taskId, input.fileType, input.content);
      return { success: true };
    }),

  exportAll: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const files = await getTaskMemory(input.taskId);
      return files.map((f) => ({
        filename:
          f.fileType === "task_plan"
            ? "task_plan.md"
            : f.fileType === "findings"
              ? "findings.md"
              : "progress.md",
        content: f.content,
        fileType: f.fileType,
      }));
    }),
});

// ─── Chat Router ──────────────────────────────────────────────────────────────

const chatRouter = router({
  getMessages: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getChatMessages(input.taskId);
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        message: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      // Save user message
      await addChatMessage(input.taskId, "user", input.message);

      // Get history for context
      const history = await getChatMessages(input.taskId);
      const chatHistory = history.slice(-20).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      // Get AI response
      const response = await chatWithAgent(input.taskId, input.message, chatHistory);

      // Save assistant message
      const msgId = await addChatMessage(input.taskId, "assistant", response);

      return { response, messageId: msgId };
    }),
});

// ─── Errors Router ────────────────────────────────────────────────────────────

const errorsRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getErrorLogs(input.taskId);
    }),

  log: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        error: z.string(),
        attempt: z.number().min(1).max(3),
        resolution: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const id = await logError(input.taskId, input.error, input.attempt, input.resolution);
      return { success: true, id };
    }),
});

// ─── Sessions Router ──────────────────────────────────────────────────────────

const sessionsRouter = router({
  listByTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskById(input.taskId);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (task.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return getSessionsByTask(input.taskId);
    }),

  listByUser: protectedProcedure.query(async ({ ctx }) => {
    return getSessionsByUser(ctx.user.id);
  }),
});

// ─── Password Helpers ────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });

        const passwordHash = await hashPassword(input.password);
        const openId = nanoid();
        await upsertUser({
          openId,
          email: input.email,
          name: input.name ?? null,
          passwordHash,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, { name: input.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true } as const;
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user?.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });

        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  tasks: tasksRouter,
  agent: agentRouter,
  memory: memoryRouter,
  chat: chatRouter,
  errors: errorsRouter,
  sessions: sessionsRouter,
  reasoning: reasoningRouter,
  analytics: analyticsRouter,
  multiFormat: multiFormatRouter,
  parallel: parallelRouter,
  webhooks: webhooksRouter,
});

export type AppRouter = typeof appRouter;

