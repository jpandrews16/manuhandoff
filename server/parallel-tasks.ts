/**
 * Parallel Tasks & Agent Coordination
 * Support for running multiple tasks in parallel with coordination
 */

import { getTaskById, createTask } from "./db";
import { runAgentLoop } from "./agent";

export interface ParallelTaskConfig {
  parentTaskId?: number;
  maxConcurrent?: number;
  dependencies?: number[];
  timeout?: number;
  retryOnFailure?: boolean;
}

export interface TaskCoordinator {
  taskId: number;
  status: "pending" | "running" | "completed" | "failed" | "waiting";
  progress: number;
  error?: string;
}

class ParallelTaskManager {
  private runningTasks = new Map<number, Promise<void>>();
  private taskQueue: number[] = [];
  private maxConcurrent: number = 3;
  private taskCoordinators = new Map<number, TaskCoordinator>();

  /**
   * Run multiple tasks in parallel with coordination
   */
  async runParallelTasks(
    taskIds: number[],
    config: ParallelTaskConfig = {}
  ): Promise<Map<number, TaskCoordinator>> {
    this.maxConcurrent = config.maxConcurrent || 3;

    // Initialize coordinators
    for (const taskId of taskIds) {
      this.taskCoordinators.set(taskId, {
        taskId,
        status: "pending",
        progress: 0,
      });
    }

    // Build dependency graph
    const dependencyMap = await this.buildDependencyMap(taskIds, config.dependencies || []);

    // Start task execution
    this.taskQueue = taskIds;
    await this.processQueue(dependencyMap, config);

    return this.taskCoordinators;
  }

  /**
   * Build dependency graph for tasks
   */
  private async buildDependencyMap(
    taskIds: number[],
    dependencies: number[]
  ): Promise<Map<number, number[]>> {
    const map = new Map<number, number[]>();

    for (const taskId of taskIds) {
      map.set(taskId, []);
    }

    // Add explicit dependencies
    for (const depId of dependencies) {
      if (map.has(depId)) {
        for (const taskId of taskIds) {
          if (taskId !== depId) {
            map.get(taskId)?.push(depId);
          }
        }
      }
    }

    return map;
  }

  /**
   * Process task queue respecting concurrency and dependencies
   */
  private async processQueue(
    dependencyMap: Map<number, number[]>,
    config: ParallelTaskConfig
  ): Promise<void> {
    const completedTasks = new Set<number>();

    while (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
      // Check for tasks that can be started
      while (this.runningTasks.size < this.maxConcurrent && this.taskQueue.length > 0) {
        const taskId = this.taskQueue.shift();
        if (!taskId) break;

        const coordinator = this.taskCoordinators.get(taskId);
        if (!coordinator) continue;

        // Check dependencies
        const deps = dependencyMap.get(taskId) || [];
        const allDepsComplete = deps.every((depId) => completedTasks.has(depId));

        if (!allDepsComplete) {
          // Re-queue if dependencies not met
          this.taskQueue.push(taskId);
          continue;
        }

        // Start task execution
        coordinator.status = "running";
        const taskPromise = this.executeTask(taskId, config).then(() => {
          completedTasks.add(taskId);
          this.runningTasks.delete(taskId);
        });

        this.runningTasks.set(taskId, taskPromise);
      }

      // Wait for at least one task to complete
      if (this.runningTasks.size > 0) {
        await Promise.race(this.runningTasks.values());
      }
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(taskId: number, config: ParallelTaskConfig): Promise<void> {
    const coordinator = this.taskCoordinators.get(taskId);
    if (!coordinator) return;

    try {
      const task = await getTaskById(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Run agent loop with progress tracking
      const progressCallback = (phaseIndex: number, _status: string) => {
        if (coordinator) {
          coordinator.progress = Math.round((phaseIndex / 7) * 100);
        }
      };

      await runAgentLoop(taskId, task.userId, progressCallback);

      coordinator.status = "completed";
      coordinator.progress = 100;
    } catch (error) {
      coordinator.status = "failed";
      coordinator.error = error instanceof Error ? error.message : String(error);

      // Retry if configured
      if (config.retryOnFailure) {
        coordinator.status = "pending";
        this.taskQueue.push(taskId);
      }
    }
  }

  /**
   * Get coordinator status
   */
  getCoordinator(taskId: number): TaskCoordinator | undefined {
    return this.taskCoordinators.get(taskId);
  }

  /**
   * Get all coordinators
   */
  getAllCoordinators(): Map<number, TaskCoordinator> {
    return this.taskCoordinators;
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: number): Promise<void> {
    const coordinator = this.taskCoordinators.get(taskId);
    if (coordinator) {
      coordinator.status = "failed";
      coordinator.error = "Task cancelled by user";
    }

    // Remove from queue
    this.taskQueue = this.taskQueue.filter((id) => id !== taskId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    pending: number;
    avgProgress: number;
  } {
    const coordinators = Array.from(this.taskCoordinators.values());
    const stats = {
      total: coordinators.length,
      running: coordinators.filter((c) => c.status === "running").length,
      completed: coordinators.filter((c) => c.status === "completed").length,
      failed: coordinators.filter((c) => c.status === "failed").length,
      pending: coordinators.filter((c) => c.status === "pending" || c.status === "waiting").length,
      avgProgress: coordinators.reduce((sum, c) => sum + c.progress, 0) / coordinators.length,
    };
    return stats;
  }
}

// Singleton instance
export const parallelTaskManager = new ParallelTaskManager();

/**
 * Create a batch of related tasks
 */
export async function createTaskBatch(
  userId: number,
  parentTitle: string,
  subtasks: Array<{ title: string; description: string }>
): Promise<number[]> {
  const taskIds: number[] = [];

  // Create parent task
  await createTask(userId, parentTitle, `Batch: ${subtasks.length} subtasks`);

  // Create subtasks
  for (const subtask of subtasks) {
    const taskId = await createTask(userId, subtask.title, subtask.description);
    taskIds.push(taskId);
  }

  return taskIds;
}
