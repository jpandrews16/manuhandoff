/**
 * Reasoning Router
 * Exposes agent reasoning, thinking steps, and reflections via tRPC
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getMemoryFile, getTaskById } from "./db";

export const reasoningRouter = router({
  /**
   * Get the complete thinking process for a task
   */
  getThinkingProcess: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const progress = await getMemoryFile(input.taskId, "progress");
      if (!progress) {
        return { thinking: [], phases: [] };
      }

      // Parse thinking steps from progress file
      const content = progress.content || "";
      const phases = content.split(/## Phase \d+:/);

      const thinking = phases
        .slice(1)
        .map((phase, idx) => ({
          phaseIndex: idx,
          content: phase.trim().substring(0, 500),
          timestamp: new Date().toISOString(),
        }));

      return {
        thinking,
        phases: phases.length - 1,
        lastUpdated: progress.updatedAt,
      };
    }),

  /**
   * Get reflection for a specific phase
   */
  getPhaseReflection: protectedProcedure
    .input(z.object({ taskId: z.number(), phaseIndex: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const progress = await getMemoryFile(input.taskId, "progress");
      if (!progress) {
        return null;
      }

      // Extract reflection for specific phase
      const phaseRegex = new RegExp(
        `### Phase ${input.phaseIndex + 1}:.*?(?=### Phase|$)`,
        "s"
      );
      const match = progress.content.match(phaseRegex);

      if (!match) {
        return null;
      }

      return {
        phaseIndex: input.phaseIndex,
        reflection: match[0],
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Get decision log for a task
   */
  getDecisionLog: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const taskPlan = await getMemoryFile(input.taskId, "task_plan");
      if (!taskPlan) {
        return [];
      }

      // Parse decisions from task_plan
      const content = taskPlan.content || "";
      const decisionsSection = content.match(
        /## Decisions Made\n\|.*?\n([\s\S]*?)(?=##|$)/
      );

      if (!decisionsSection) {
        return [];
      }

      const decisions = decisionsSection[1]
        .split("\n")
        .filter((line) => line.startsWith("|"))
        .map((line) => {
          const parts = line.split("|").slice(1, -1);
          return {
            decision: parts[0]?.trim() || "",
            rationale: parts[1]?.trim() || "",
          };
        });

      return decisions;
    }),

  /**
   * Get learning log for a task
   */
  getLearningLog: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const progress = await getMemoryFile(input.taskId, "progress");
      if (!progress) {
        return [];
      }

      // Parse learning entries
      const learningRegex = /## Learning: (\w+)\n- (.*?)\n- Recorded: (.*?)(?=##|$)/g;
      const learnings: Array<{
        category: string;
        learning: string;
        timestamp: string;
      }> = [];

      let match;
      while ((match = learningRegex.exec(progress.content)) !== null) {
        learnings.push({
          category: match[1],
          learning: match[2],
          timestamp: match[3],
        });
      }

      return learnings;
    }),

  /**
   * Get adaptive plan adjustments
   */
  getAdaptations: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const taskPlan = await getMemoryFile(input.taskId, "task_plan");
      if (!taskPlan) {
        return [];
      }

      // Parse adaptations section
      const content = taskPlan.content || "";
      const adaptationsSection = content.match(
        /## Adaptations\n([\s\S]*?)(?=##|$)/
      );

      if (!adaptationsSection) {
        return [];
      }

      const adaptations = adaptationsSection[1]
        .split("\n")
        .filter((line) => line.startsWith("-"))
        .map((line) => line.replace(/^- /, ""));

      return adaptations;
    }),

  /**
   * Get complete reasoning summary
   */
  getReasoningSummary: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const [taskPlan, findings, progress] = await Promise.all([
        getMemoryFile(input.taskId, "task_plan"),
        getMemoryFile(input.taskId, "findings"),
        getMemoryFile(input.taskId, "progress"),
      ]);

      // Count phases completed
      const progressContent = progress?.content || "";
      const phasesCompleted = (progressContent.match(/### Phase \d+:/g) || [])
        .length;

      // Count decisions made
      const taskPlanContent = taskPlan?.content || "";
      const decisionsMade = (
        taskPlanContent.match(/\| .*? \| .*? \|/g) || []
      ).length;

      // Count learnings recorded
      const learningsRecorded = (progressContent.match(/## Learning:/g) || [])
        .length;

      // Count adaptations
      const adaptationsApplied = (
        taskPlanContent.match(/## Adaptations\n/g) || []
      ).length;

      return {
        taskId: input.taskId,
        taskTitle: task.title,
        status: task.status,
        phasesCompleted,
        decisionsMade,
        learningsRecorded,
        adaptationsApplied,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };
    }),
});
