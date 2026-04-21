import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { parallelTaskManager, createTaskBatch } from "./parallel-tasks";

export const parallelRouter = router({
  /**
   * Run multiple tasks in parallel
   */
  runParallel: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        maxConcurrent: z.number().optional(),
        retryOnFailure: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const coordinators = await parallelTaskManager.runParallelTasks(input.taskIds, {
        maxConcurrent: input.maxConcurrent,
        retryOnFailure: input.retryOnFailure,
      });

      return {
        success: true,
        coordinators: Array.from(coordinators.values()),
      };
    }),

  /**
   * Get parallel execution status
   */
  getStatus: protectedProcedure
    .input(z.object({ taskIds: z.array(z.number()).optional() }))
    .query(({ input }) => {
      const coordinators = parallelTaskManager.getAllCoordinators();
      const filtered = input.taskIds
        ? Array.from(coordinators.values()).filter((c) => input.taskIds?.includes(c.taskId))
        : Array.from(coordinators.values());

      return {
        coordinators: filtered,
        stats: parallelTaskManager.getStats(),
      };
    }),

  /**
   * Cancel a parallel task
   */
  cancelTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      await parallelTaskManager.cancelTask(input.taskId);
      return { success: true };
    }),

  /**
   * Create a batch of tasks
   */
  createBatch: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        subtasks: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const taskIds = await createTaskBatch(ctx.user.id, input.title, input.subtasks);
      return {
        success: true,
        taskIds,
        count: taskIds.length,
      };
    }),
});
