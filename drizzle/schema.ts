import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  longtext,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tasks table
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "running", "paused", "completed", "error"])
    .default("pending")
    .notNull(),
  currentPhaseIndex: int("currentPhaseIndex").default(0).notNull(),
  totalPhases: int("totalPhases").default(7).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// Task phases table — the 7-step agent loop
export const taskPhases = mysqlTable("task_phases", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  phaseIndex: int("phaseIndex").notNull(), // 0-6
  name: varchar("name", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["pending", "active", "completed", "error"])
    .default("pending")
    .notNull(),
  notes: text("notes"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type TaskPhase = typeof taskPhases.$inferSelect;
export type InsertTaskPhase = typeof taskPhases.$inferInsert;

// Task memory files: task_plan.md, findings.md, progress.md
export const taskMemory = mysqlTable("task_memory", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  fileType: mysqlEnum("fileType", ["task_plan", "findings", "progress"]).notNull(),
  content: longtext("content").notNull(),
  storageKey: varchar("storageKey", { length: 512 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskMemory = typeof taskMemory.$inferSelect;
export type InsertTaskMemory = typeof taskMemory.$inferInsert;

// Chat messages
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: longtext("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// Error logs with 3-attempt protocol
export const errorLogs = mysqlTable("error_logs", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  error: text("error").notNull(),
  attempt: int("attempt").notNull().default(1), // 1, 2, or 3
  resolution: text("resolution"),
  escalated: int("escalated").default(0).notNull(), // 1 = escalated to user
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;

// Sessions for context recovery
export const agentSessions = mysqlTable("agent_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId").notNull(),
  contextSnapshot: longtext("contextSnapshot"),
  isActive: int("isActive").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = typeof agentSessions.$inferInsert;
