/**
 * Streaming System for Real-time Agent Reasoning
 * Provides SSE (Server-Sent Events) for live agent thinking and execution
 */

import type { Response } from "express";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreamEvent {
  type:
    | "thinking"
    | "action"
    | "finding"
    | "progress"
    | "error"
    | "complete"
    | "tool_start"
    | "tool_result";
  phase?: number;
  phaseName?: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class StreamWriter {
  private res: Response;
  private closed: boolean = false;

  constructor(res: Response) {
    this.res = res;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Handle client disconnect
    res.on("close", () => {
      this.closed = true;
    });
  }

  write(event: StreamEvent): void {
    if (this.closed) return;

    try {
      const data = JSON.stringify(event);
      this.res.write(`data: ${data}\n\n`);
    } catch (e) {
      console.error("[Streaming] Failed to write event:", e);
    }
  }

  writeThinking(content: string, phase?: number, phaseName?: string): void {
    this.write({
      type: "thinking",
      phase,
      phaseName,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  writeAction(content: string, phase?: number): void {
    this.write({
      type: "action",
      phase,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  writeProgress(content: string, metadata?: Record<string, any>): void {
    this.write({
      type: "progress",
      content,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  writeToolStart(toolName: string, params?: Record<string, any>): void {
    this.write({
      type: "tool_start",
      content: `Starting tool: ${toolName}`,
      timestamp: new Date().toISOString(),
      metadata: { toolName, params },
    });
  }

  writeToolResult(toolName: string, result: string, success: boolean): void {
    this.write({
      type: "tool_result",
      content: result,
      timestamp: new Date().toISOString(),
      metadata: { toolName, success },
    });
  }

  writeError(error: string, phase?: number): void {
    this.write({
      type: "error",
      phase,
      content: error,
      timestamp: new Date().toISOString(),
    });
  }

  writeComplete(summary: string): void {
    this.write({
      type: "complete",
      content: summary,
      timestamp: new Date().toISOString(),
    });
    this.close();
  }

  close(): void {
    if (!this.closed) {
      this.res.end();
      this.closed = true;
    }
  }

  isClosed(): boolean {
    return this.closed;
  }
}

// ─── Streaming Helpers ────────────────────────────────────────────────────────

export function createStreamWriter(res: Response): StreamWriter {
  return new StreamWriter(res);
}

export async function streamPhaseExecution(
  stream: StreamWriter,
  phaseIndex: number,
  phaseName: string,
  executionFn: (stream: StreamWriter) => Promise<string>
): Promise<string> {
  try {
    stream.writeThinking(
      `Starting phase: ${phaseName}`,
      phaseIndex,
      phaseName
    );

    const result = await executionFn(stream);

    stream.writeProgress(`Phase ${phaseName} completed successfully`, {
      phaseIndex,
      status: "completed",
    });

    return result;
  } catch (error: any) {
    stream.writeError(
      `Phase execution failed: ${error.message}`,
      phaseIndex
    );
    throw error;
  }
}

// ─── Streaming Chat Response ──────────────────────────────────────────────────

export async function streamChatResponse(
  stream: StreamWriter,
  userMessage: string,
  chatFn: (onChunk: (chunk: string) => void) => Promise<string>
): Promise<string> {
  try {
    stream.writeThinking(`Processing message: ${userMessage}`);

    const chunks: string[] = [];

    const onChunk = (chunk: string) => {
      chunks.push(chunk);
      stream.write({
        type: "thinking",
        content: chunk,
        timestamp: new Date().toISOString(),
      });
    };

    const fullResponse = await chatFn(onChunk);

    stream.writeComplete("Chat response complete");

    return fullResponse;
  } catch (error: any) {
    stream.writeError(`Chat processing failed: ${error.message}`);
    throw error;
  }
}

// ─── Streaming Agent Loop ────────────────────────────────────────────────────

export async function streamAgentLoop(
  stream: StreamWriter,
  phases: Array<{ index: number; name: string; goal: string }>,
  executePhaseFn: (
    stream: StreamWriter,
    phaseIndex: number
  ) => Promise<boolean>
): Promise<void> {
  try {
    stream.writeProgress(`Starting agent loop with ${phases.length} phases`);

    for (const phase of phases) {
      stream.writeThinking(
        `Analyzing phase: ${phase.name}`,
        phase.index,
        phase.name
      );

      const success = await executePhaseFn(stream, phase.index);

      if (!success) {
        stream.writeError(`Phase ${phase.name} failed`, phase.index);
        break;
      }

      stream.writeProgress(`Phase ${phase.index + 1}/${phases.length} complete`, {
        phaseIndex: phase.index,
        status: "completed",
      });
    }

    stream.writeComplete("Agent loop completed successfully");
  } catch (error: any) {
    stream.writeError(`Agent loop failed: ${error.message}`);
    stream.close();
  }
}

// ─── Streaming Utilities ──────────────────────────────────────────────────────

export function formatStreamEvent(event: StreamEvent): string {
  return JSON.stringify(event);
}

export function parseStreamEvent(data: string): StreamEvent | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
