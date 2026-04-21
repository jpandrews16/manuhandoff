/**
 * Streaming Router for Real-time Agent Execution
 * Provides SSE endpoints for live agent reasoning and execution
 */

import type { Express, Request, Response } from "express";
import { createStreamWriter, streamPhaseExecution } from "./streaming";
import { runAgentLoop } from "./agent";
import { getTaskById } from "./db";
import { sdk } from "./_core/sdk";

export function registerStreamingRoutes(app: Express) {
  /**
   * Stream agent loop execution in real-time
   * GET /api/stream/task/:taskId/loop
   */
  app.get("/api/stream/task/:taskId/loop", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const taskId = parseInt(req.params.taskId, 10);
      if (isNaN(taskId)) {
        res.status(400).json({ error: "Invalid taskId" });
        return;
      }

      // Verify task ownership
      const task = await getTaskById(taskId);
      if (!task || task.userId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Create stream writer
      const stream = createStreamWriter(res);

      // Run agent loop with streaming
      try {
        await runAgentLoop(taskId, user.id, (phaseIndex, status) => {
          stream.writeProgress(`Phase ${phaseIndex + 1} status: ${status}`, {
            phaseIndex,
            status,
          });
        });

        stream.writeComplete("Agent loop completed successfully");
      } catch (error: any) {
        stream.writeError(`Agent loop failed: ${error.message}`);
        stream.close();
      }
    } catch (error: any) {
      console.error("[Streaming] Error in agent loop stream:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Stream chat response in real-time
   * POST /api/stream/task/:taskId/chat
   */
  app.post("/api/stream/task/:taskId/chat", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const taskId = parseInt(req.params.taskId, 10);
      const { message } = req.body;

      if (isNaN(taskId) || !message) {
        res.status(400).json({ error: "Invalid taskId or message" });
        return;
      }

      // Verify task ownership
      const task = await getTaskById(taskId);
      if (!task || task.userId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Create stream writer
      const stream = createStreamWriter(res);

      stream.writeThinking(`Processing message: "${message}"`);

      // Stream response (simulated chunking)
      // In production, this would use actual streaming from LLM
      const chunks = [
        "I'm analyzing your message...",
        "Based on the task context...",
        "Here's what I found...",
        "The recommendation is...",
      ];

      for (const chunk of chunks) {
        if (stream.isClosed()) break;
        stream.write({
          type: "thinking",
          content: chunk,
          timestamp: new Date().toISOString(),
        });
        // Simulate delay between chunks
        await new Promise((r) => setTimeout(r, 500));
      }

      stream.writeComplete("Chat response complete");
    } catch (error: any) {
      console.error("[Streaming] Error in chat stream:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Stream phase execution details
   * GET /api/stream/task/:taskId/phase/:phaseIndex
   */
  app.get(
    "/api/stream/task/:taskId/phase/:phaseIndex",
    async (req: Request, res: Response) => {
      try {
        // Authenticate
        const user = await sdk.authenticateRequest(req);
        if (!user) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        const taskId = parseInt(req.params.taskId, 10);
        const phaseIndex = parseInt(req.params.phaseIndex, 10);

        if (isNaN(taskId) || isNaN(phaseIndex)) {
          res.status(400).json({ error: "Invalid parameters" });
          return;
        }

        // Verify task ownership
        const task = await getTaskById(taskId);
        if (!task || task.userId !== user.id) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }

        // Create stream writer
        const stream = createStreamWriter(res);

        stream.writeThinking(`Executing phase ${phaseIndex + 1}...`);

        // Simulate phase execution with streaming events
        const phaseSteps = [
          "Analyzing requirements...",
          "Evaluating approaches...",
          "Selecting strategy...",
          "Executing actions...",
          "Analyzing results...",
          "Reflecting on outcomes...",
        ];

        for (const step of phaseSteps) {
          if (stream.isClosed()) break;
          stream.writeAction(step, phaseIndex);
          await new Promise((r) => setTimeout(r, 1000));
        }

        stream.writeProgress(`Phase ${phaseIndex + 1} completed`, {
          phaseIndex,
          status: "completed",
        });

        stream.writeComplete(`Phase ${phaseIndex + 1} execution complete`);
      } catch (error: any) {
        console.error("[Streaming] Error in phase stream:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  /**
   * Stream task progress metrics
   * GET /api/stream/task/:taskId/metrics
   */
  app.get("/api/stream/task/:taskId/metrics", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const taskId = parseInt(req.params.taskId, 10);
      if (isNaN(taskId)) {
        res.status(400).json({ error: "Invalid taskId" });
        return;
      }

      // Verify task ownership
      const task = await getTaskById(taskId);
      if (!task || task.userId !== user.id) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Create stream writer
      const stream = createStreamWriter(res);

      // Stream metrics updates every 2 seconds
      let count = 0;
      const metricsInterval = setInterval(() => {
        if (stream.isClosed()) {
          clearInterval(metricsInterval);
          return;
        }

        count++;
        stream.write({
          type: "progress",
          content: `Metrics update ${count}`,
          timestamp: new Date().toISOString(),
          metadata: {
            executionTime: count * 2000,
            phasesCompleted: Math.min(count, 7),
            toolsUsed: Math.floor(count / 2),
            errorsEncountered: Math.floor(count / 5),
          },
        });

        if (count >= 10) {
          clearInterval(metricsInterval);
          stream.writeComplete("Metrics stream complete");
        }
      }, 2000);

      // Clean up interval on client disconnect
      res.on("close", () => {
        clearInterval(metricsInterval);
      });
    } catch (error: any) {
      console.error("[Streaming] Error in metrics stream:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
