import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agentSessions,
  chatMessages,
  errorLogs,
  taskMemory,
  taskPhases,
  tasks,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      values[field] = value ?? null;
      updateSet[field] = value ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const AGENT_PHASES = [
  "Analizar",
  "Pensar",
  "Seleccionar",
  "Ejecutar",
  "Observar",
  "Iterar",
  "Entregar",
] as const;

export async function createTask(userId: number, title: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(tasks).values({
    userId,
    title,
    description,
    status: "pending",
    currentPhaseIndex: 0,
    totalPhases: 7,
  });

  const taskId = (result as any).insertId as number;

  // Create the 7 phases
  const phaseRows = AGENT_PHASES.map((name, phaseIndex) => ({
    taskId,
    phaseIndex,
    name,
    status: "pending" as const,
  }));
  await db.insert(taskPhases).values(phaseRows);

  // Create memory files
  const memoryRows = (["task_plan", "findings", "progress"] as const).map((fileType) => ({
    taskId,
    fileType,
    content: getInitialMemoryContent(fileType, title),
  }));
  await db.insert(taskMemory).values(memoryRows);

  return taskId;
}

function getInitialMemoryContent(
  fileType: "task_plan" | "findings" | "progress",
  title: string
): string {
  if (fileType === "task_plan") {
    return `# Task Plan: ${title}\n\n## Goal\n${title}\n\n## Current Phase\nPhase 1 - Analizar\n\n## Phases\n${AGENT_PHASES.map((p, i) => `### Phase ${i + 1}: ${p}\n- **Status:** pending`).join("\n\n")}\n\n## Decisions Made\n| Decision | Rationale |\n|----------|-----------|\n\n## Errors Encountered\n| Error | Attempt | Resolution |\n|-------|---------|------------|\n`;
  }
  if (fileType === "findings") {
    return `# Findings: ${title}\n\n## Key Discoveries\n\n## Research Notes\n\n## Decisions\n`;
  }
  return `# Progress: ${title}\n\n## Session Log\n\n### Session 1 — ${new Date().toISOString()}\n- Task created\n`;
}

export async function getTasksByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.updatedAt));
}

export async function getTaskById(taskId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return result[0];
}

export async function updateTaskStatus(
  taskId: number,
  status: "pending" | "running" | "paused" | "completed" | "error",
  currentPhaseIndex?: number
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (currentPhaseIndex !== undefined) updateData.currentPhaseIndex = currentPhaseIndex;
  await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));
}

export async function deleteTask(taskId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

// ─── Task Phases ──────────────────────────────────────────────────────────────

export async function getTaskPhases(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskPhases).where(eq(taskPhases.taskId, taskId));
}

export async function updatePhaseStatus(
  taskId: number,
  phaseIndex: number,
  status: "pending" | "active" | "completed" | "error",
  notes?: string
) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.notes = notes;
  if (status === "active") updateData.startedAt = new Date();
  if (status === "completed" || status === "error") updateData.completedAt = new Date();
  await db
    .update(taskPhases)
    .set(updateData)
    .where(and(eq(taskPhases.taskId, taskId), eq(taskPhases.phaseIndex, phaseIndex)));
}

// ─── Task Memory ──────────────────────────────────────────────────────────────

export async function getTaskMemory(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskMemory).where(eq(taskMemory.taskId, taskId));
}

export async function getMemoryFile(
  taskId: number,
  fileType: "task_plan" | "findings" | "progress"
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(taskMemory)
    .where(and(eq(taskMemory.taskId, taskId), eq(taskMemory.fileType, fileType)))
    .limit(1);
  return result[0];
}

export async function updateMemoryFile(
  taskId: number,
  fileType: "task_plan" | "findings" | "progress",
  content: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(taskMemory)
    .set({ content })
    .where(and(eq(taskMemory.taskId, taskId), eq(taskMemory.fileType, fileType)));
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function getChatMessages(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.taskId, taskId))
    .orderBy(chatMessages.createdAt);
}

export async function addChatMessage(
  taskId: number,
  role: "user" | "assistant" | "system",
  content: string
) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.insert(chatMessages).values({ taskId, role, content });
  return (result as any).insertId as number;
}

// ─── Error Logs ───────────────────────────────────────────────────────────────

export async function getErrorLogs(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(errorLogs)
    .where(eq(errorLogs.taskId, taskId))
    .orderBy(errorLogs.createdAt);
}

export async function logError(
  taskId: number,
  error: string,
  attempt: number,
  resolution?: string
) {
  const db = await getDb();
  if (!db) return;
  const escalated = attempt >= 3 ? 1 : 0;
  const [result] = await db
    .insert(errorLogs)
    .values({ taskId, error, attempt, resolution, escalated });
  return (result as any).insertId as number;
}

// ─── Agent Sessions ───────────────────────────────────────────────────────────

export async function createSession(userId: number, taskId: number) {
  const db = await getDb();
  if (!db) return undefined;
  // Deactivate previous sessions for this task
  await db
    .update(agentSessions)
    .set({ isActive: 0, endedAt: new Date() })
    .where(and(eq(agentSessions.taskId, taskId), eq(agentSessions.isActive, 1)));
  const [result] = await db.insert(agentSessions).values({ userId, taskId, isActive: 1 });
  return (result as any).insertId as number;
}

export async function getSessionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.userId, userId))
    .orderBy(desc(agentSessions.createdAt));
}

export async function getSessionsByTask(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.taskId, taskId))
    .orderBy(desc(agentSessions.createdAt));
}

export async function updateSessionSnapshot(sessionId: number, contextSnapshot: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(agentSessions)
    .set({ contextSnapshot })
    .where(eq(agentSessions.id, sessionId));
}
