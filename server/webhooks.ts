/**
 * Webhooks System
 * Send notifications to external systems when tasks complete or fail
 */

import axios from "axios";

export interface WebhookEvent {
  type: "task.created" | "task.started" | "task.completed" | "task.failed" | "phase.completed" | "error.occurred";
  taskId: number;
  userId: number;
  timestamp: Date;
  data: Record<string, any>;
}

export interface WebhookSubscription {
  id: string;
  userId: number;
  url: string;
  events: WebhookEvent["type"][];
  active: boolean;
  createdAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

class WebhookManager {
  private subscriptions = new Map<string, WebhookSubscription>();
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  /**
   * Register a webhook subscription
   */
  registerWebhook(
    userId: number,
    url: string,
    events: WebhookEvent["type"][]
  ): WebhookSubscription {
    const id = `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const subscription: WebhookSubscription = {
      id,
      userId,
      url,
      events,
      active: true,
      createdAt: new Date(),
      failureCount: 0,
    };

    this.subscriptions.set(id, subscription);
    return subscription;
  }

  /**
   * Unregister a webhook
   */
  unregisterWebhook(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  /**
   * Get user's webhooks
   */
  getUserWebhooks(userId: number): WebhookSubscription[] {
    return Array.from(this.subscriptions.values()).filter((w) => w.userId === userId);
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(event: WebhookEvent): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.values()).filter(
      (w) => w.userId === event.userId && w.events.includes(event.type) && w.active
    );

    for (const subscription of subscriptions) {
      await this.sendWebhook(subscription, event);
    }
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWebhook(subscription: WebhookSubscription, event: WebhookEvent): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        await axios.post(subscription.url, event, {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
            "X-Handoff-Event": event.type,
            "X-Handoff-Signature": this.generateSignature(event),
          },
        });

        // Success - reset failure count
        subscription.failureCount = 0;
        subscription.lastTriggeredAt = new Date();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Wait before retry
        if (attempt < this.retryAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    // All retries failed
    subscription.failureCount++;
    if (subscription.failureCount >= 5) {
      subscription.active = false;
    }

    console.error(`Webhook failed for ${subscription.url}: ${lastError?.message}`);
  }

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(event: WebhookEvent): string {
    const crypto = require("crypto");
    const payload = JSON.stringify(event);
    const signature = crypto.createHmac("sha256", "handoff-secret").update(payload).digest("hex");
    return signature;
  }

  /**
   * Get webhook statistics
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    totalFailures: number;
  } {
    const subs = Array.from(this.subscriptions.values());
    return {
      total: subs.length,
      active: subs.filter((w) => w.active).length,
      inactive: subs.filter((w) => !w.active).length,
      totalFailures: subs.reduce((sum, w) => sum + w.failureCount, 0),
    };
  }
}

// Singleton instance
export const webhookManager = new WebhookManager();

/**
 * Emit common webhook events
 */
export async function emitTaskCreated(taskId: number, userId: number, title: string): Promise<void> {
  await webhookManager.triggerEvent({
    type: "task.created",
    taskId,
    userId,
    timestamp: new Date(),
    data: { title },
  });
}

export async function emitTaskStarted(taskId: number, userId: number): Promise<void> {
  await webhookManager.triggerEvent({
    type: "task.started",
    taskId,
    userId,
    timestamp: new Date(),
    data: {},
  });
}

export async function emitTaskCompleted(taskId: number, userId: number, result: string): Promise<void> {
  await webhookManager.triggerEvent({
    type: "task.completed",
    taskId,
    userId,
    timestamp: new Date(),
    data: { result },
  });
}

export async function emitTaskFailed(taskId: number, userId: number, error: string): Promise<void> {
  await webhookManager.triggerEvent({
    type: "task.failed",
    taskId,
    userId,
    timestamp: new Date(),
    data: { error },
  });
}

export async function emitPhaseCompleted(
  taskId: number,
  userId: number,
  phaseIndex: number,
  phaseName: string
): Promise<void> {
  await webhookManager.triggerEvent({
    type: "phase.completed",
    taskId,
    userId,
    timestamp: new Date(),
    data: { phaseIndex, phaseName },
  });
}

export async function emitErrorOccurred(
  taskId: number,
  userId: number,
  errorMessage: string,
  attempt: number
): Promise<void> {
  await webhookManager.triggerEvent({
    type: "error.occurred",
    taskId,
    userId,
    timestamp: new Date(),
    data: { errorMessage, attempt },
  });
}
