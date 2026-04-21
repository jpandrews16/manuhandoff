/**
 * Analytics Router
 * Provides insights into agent performance, execution metrics, and usage patterns
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getTasksByUser,
  getTaskById,
  getErrorLogs,
  getChatMessages,
  getTaskPhases,
} from "./db";

export const analyticsRouter = router({
  /**
   * Get performance metrics for a specific task
   */
  getTaskMetrics: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const phases = await getTaskPhases(input.taskId);
      const errors = await getErrorLogs(input.taskId);
      const messages = await getChatMessages(input.taskId);

      // Calculate metrics
      const completedPhases = phases.filter((p) => p.status === "completed").length;
      const failedPhases = phases.filter((p) => p.status === "error").length;
      const executionTime = task.updatedAt.getTime() - task.createdAt.getTime();
      const successRate = phases.length > 0 ? (completedPhases / phases.length) * 100 : 0;

      return {
        taskId: input.taskId,
        taskTitle: task.title,
        status: task.status,
        totalPhases: phases.length,
        completedPhases,
        failedPhases,
        successRate: successRate.toFixed(2),
        executionTime: `${(executionTime / 1000 / 60).toFixed(2)} min`,
        executionTimeMs: executionTime,
        totalErrors: errors.length,
        chatMessages: messages.length,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        avgTimePerPhase: phases.length > 0 ? `${(executionTime / phases.length / 1000).toFixed(2)}s` : "N/A",
      };
    }),

  /**
   * Get user-level analytics
   */
  getUserAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await getTasksByUser(ctx.user.id);

    if (tasks.length === 0) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        runningTasks: 0,
        successRate: "0",
        totalExecutionTime: "0 min",
        avgTaskDuration: "N/A",
        mostRecentTask: null,
      };
    }

    const completed = tasks.filter((t) => t.status === "completed").length;
    const failed = tasks.filter((t) => t.status === "error").length;
    const running = tasks.filter((t) => t.status === "running").length;
    const successRate = ((completed / tasks.length) * 100).toFixed(2);

    // Calculate total and average execution time
    let totalTime = 0;
    for (const task of tasks) {
      totalTime += task.updatedAt.getTime() - task.createdAt.getTime();
    }
    const avgTime = totalTime / tasks.length;

    return {
      totalTasks: tasks.length,
      completedTasks: completed,
      failedTasks: failed,
      runningTasks: running,
      successRate,
      totalExecutionTime: `${(totalTime / 1000 / 60 / 60).toFixed(2)} hours`,
      avgTaskDuration: `${(avgTime / 1000 / 60).toFixed(2)} min`,
      mostRecentTask: tasks[0] || null,
    };
  }),

  /**
   * Get error analysis
   */
  getErrorAnalysis: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const errors = await getErrorLogs(input.taskId);

      // Categorize errors
      const errorsByType: Record<string, number> = {};
      const errorsByAttempt: Record<number, number> = {};

      for (const error of errors) {
        // Count by type (first word of error message)
        const errorType = error.error.split(" ")[0] || "Unknown";
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

        // Count by attempt
        errorsByAttempt[error.attempt] = (errorsByAttempt[error.attempt] || 0) + 1;
      }

      // Calculate recovery rate
      const recoveredErrors = errors.filter((e) => e.resolution).length;
      const recoveryRate = errors.length > 0 ? ((recoveredErrors / errors.length) * 100).toFixed(2) : "0";

      return {
        totalErrors: errors.length,
        recoveredErrors,
        recoveryRate,
        errorsByType,
        errorsByAttempt,
        errors: errors.map((e) => ({
          error: e.error,
          attempt: e.attempt,
          resolved: !!e.resolution,
          resolution: e.resolution || "Escalated to user",
          createdAt: e.createdAt,
        })),
      };
    }),

  /**
   * Get engagement metrics
   */
  getEngagementMetrics: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input, ctx }) => {
      const task = await getTaskById(input.taskId);
      if (!task || task.userId !== ctx.user.id) {
        throw new Error("Task not found or unauthorized");
      }

      const messages = await getChatMessages(input.taskId);

      // Categorize messages
      const userMessages = messages.filter((m) => m.role === "user").length;
      const agentMessages = messages.filter((m) => m.role === "assistant").length;

      // Calculate message lengths
      let totalUserChars = 0;
      let totalAgentChars = 0;

      for (const msg of messages) {
        if (msg.role === "user") {
          totalUserChars += msg.content.length;
        } else {
          totalAgentChars += msg.content.length;
        }
      }

      return {
        totalMessages: messages.length,
        userMessages,
        agentMessages,
        avgUserMessageLength: userMessages > 0 ? (totalUserChars / userMessages).toFixed(0) : 0,
        avgAgentMessageLength: agentMessages > 0 ? (totalAgentChars / agentMessages).toFixed(0) : 0,
        conversationRatio: userMessages > 0 ? (agentMessages / userMessages).toFixed(2) : 0,
      };
    }),

  /**
   * Get performance trends (last 7 tasks)
   */
  getPerformanceTrends: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await getTasksByUser(ctx.user.id);

    // Get last 7 tasks
    const recentTasks = tasks.slice(0, 7).reverse();

    const trends = recentTasks.map((task, idx) => {
      const executionTime = task.updatedAt.getTime() - task.createdAt.getTime();
      return {
        taskNumber: idx + 1,
        taskTitle: task.title,
        status: task.status,
        executionTimeMin: (executionTime / 1000 / 60).toFixed(2),
        createdAt: task.createdAt,
      };
    });

    // Calculate trend (improving or degrading)
    let trend = "stable";
    if (trends.length >= 2) {
      const firstHalf = trends.slice(0, Math.ceil(trends.length / 2));
      const secondHalf = trends.slice(Math.ceil(trends.length / 2));

      const avgFirst = firstHalf.reduce((sum, t) => sum + parseFloat(t.executionTimeMin), 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, t) => sum + parseFloat(t.executionTimeMin), 0) / secondHalf.length;

      if (avgSecond < avgFirst * 0.9) {
        trend = "improving";
      } else if (avgSecond > avgFirst * 1.1) {
        trend = "degrading";
      }
    }

    return {
      trends,
      trend,
      totalTasksAnalyzed: trends.length,
    };
  }),

  /**
   * Get cache statistics
   */
  getCacheStats: protectedProcedure.query(async () => {
    try {
      const { agentCache } = await import("./cache");
      return agentCache.getStats();
    } catch (e) {
      return {
        entries: 0,
        maxSize: 1000,
        totalHits: 0,
        totalSize: "0 KB",
        utilization: "0%",
      };
    }
  }),
});
