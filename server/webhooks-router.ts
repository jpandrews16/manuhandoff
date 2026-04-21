import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { webhookManager } from "./webhooks";

export const webhooksRouter = router({
  /**
   * Register a webhook
   */
  register: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        events: z.array(
          z.enum([
            "task.created",
            "task.started",
            "task.completed",
            "task.failed",
            "phase.completed",
            "error.occurred",
          ])
        ),
      })
    )
    .mutation(({ input, ctx }) => {
      const subscription = webhookManager.registerWebhook(ctx.user.id, input.url, input.events);
      return {
        success: true,
        subscription: {
          id: subscription.id,
          url: subscription.url,
          events: subscription.events,
          active: subscription.active,
          createdAt: subscription.createdAt,
        },
      };
    }),

  /**
   * Unregister a webhook
   */
  unregister: protectedProcedure
    .input(z.object({ webhookId: z.string() }))
    .mutation(({ input }) => {
      const success = webhookManager.unregisterWebhook(input.webhookId);
      return { success };
    }),

  /**
   * List user's webhooks
   */
  list: protectedProcedure.query(({ ctx }) => {
    const webhooks = webhookManager.getUserWebhooks(ctx.user.id);
    return {
      webhooks: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        createdAt: w.createdAt,
        lastTriggeredAt: w.lastTriggeredAt,
        failureCount: w.failureCount,
      })),
    };
  }),

  /**
   * Get webhook statistics
   */
  getStats: protectedProcedure.query(() => {
    return webhookManager.getStats();
  }),
});
