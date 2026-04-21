import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import {
  AGENT_PHASES,
  addChatMessage,
  getMemoryFile,
  getTaskById,
  getTaskPhases,
  logError,
  updateMemoryFile,
  updatePhaseStatus,
  updateTaskStatus,
} from "./db";
import {
  executePhaseWithReasoning,
  adaptPlanAfterFailure,
  logDecision,
  recordLearning,
} from "./advanced-reasoning";
import { selectToolsForPhase, executeTool } from "./tools";

// ─── Phase Decomposition ──────────────────────────────────────────────────────

export async function decomposeTaskIntoPhases(
  taskTitle: string,
  taskDescription?: string
): Promise<string[]> {
  const prompt = `You are Handoff, an autonomous AI agent. A user has submitted a task. 
Your job is to create a concise plan for executing this task using the 7-phase agent loop.

Task: "${taskTitle}"
${taskDescription ? `Description: ${taskDescription}` : ""}

For each of the 7 phases below, write ONE specific action sentence (max 15 words) that describes what the agent will do in that phase for THIS specific task.

Phases: Analizar, Pensar, Seleccionar, Ejecutar, Observar, Iterar, Entregar

Respond with JSON array of exactly 7 strings, one per phase. Example:
["Analyze the task requirements and identify key constraints", "Think about the best approach...", ...]`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a task planning AI. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "phase_notes",
          strict: true,
          schema: {
            type: "object",
            properties: {
              phases: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["phases"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawC = response.choices[0]?.message?.content;
    const content = typeof rawC === 'string' ? rawC : JSON.stringify(rawC);
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.phases) && parsed.phases.length === 7) {
        return parsed.phases;
      }
    }
  } catch (e) {
    console.error("[Agent] Failed to decompose task:", e);
  }

  // Fallback: generic notes
  return AGENT_PHASES.map(
    (phase) => `${phase} the task: ${taskTitle.substring(0, 50)}`
  );
}

// ─── Task Plan Generator ──────────────────────────────────────────────────────

export async function generateTaskPlan(
  taskId: number,
  taskTitle: string,
  phaseNotes: string[]
): Promise<string> {
  const phasesMarkdown = AGENT_PHASES.map(
    (name, i) =>
      `### Phase ${i + 1}: ${name}\n- ${phaseNotes[i] || name}\n- **Status:** pending`
  ).join("\n\n");

  const plan = `# Task Plan: ${taskTitle}

## Goal
${taskTitle}

## Current Phase
Phase 1 — Analizar

## Phases
${phasesMarkdown}

## Decisions Made
| Decision | Rationale |
|----------|-----------|

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
`;

  await updateMemoryFile(taskId, "task_plan", plan);
  return plan;
}

// ─── Agent Loop Execution ─────────────────────────────────────────────────────

export async function runAgentLoop(
  taskId: number,
  userId: number,
  onPhaseChange?: (phaseIndex: number, status: string) => void
): Promise<void> {
  const task = await getTaskById(taskId);
  if (!task) throw new Error("Task not found");

  await updateTaskStatus(taskId, "running", 0);

  const phases = await getTaskPhases(taskId);
  const sortedPhases = phases.sort((a, b) => a.phaseIndex - b.phaseIndex);

  for (let i = 0; i < sortedPhases.length; i++) {
    const phase = sortedPhases[i];
    if (!phase) continue;

    try {
      // Activate phase
      await updatePhaseStatus(taskId, i, "active");
      await updateTaskStatus(taskId, "running", i);
      onPhaseChange?.(i, "active");

      // Execute phase logic
      await executePhase(taskId, i, task.title, phase.notes || "");

      // Complete phase
      await updatePhaseStatus(taskId, i, "completed");
      onPhaseChange?.(i, "completed");

      // Small delay between phases for realism
      await new Promise((r) => setTimeout(r, 800));
    } catch (error: any) {
      await handlePhaseError(taskId, i, error, userId);
      return;
    }
  }

  // All phases done
  await updateTaskStatus(taskId, "completed", 7);
  await updateProgressFile(taskId, "All 7 phases completed successfully.");

  // Notify owner
  try {
    await notifyOwner({
      title: `✅ Handoff: Task Completed`,
      content: `Task "${task.title}" (ID: ${taskId}) has completed all 7 phases successfully.`,
    });
  } catch (e) {
    console.warn("[Agent] Failed to send completion notification:", e);
  }
}

async function executePhase(
  taskId: number,
  phaseIndex: number,
  taskTitle: string,
  phaseNote: string
): Promise<void> {
  const phaseName = AGENT_PHASES[phaseIndex];

  // Use advanced reasoning for phase execution
  const execution = await executePhaseWithReasoning(
    taskId,
    phaseIndex,
    phaseName,
    phaseNote,
    taskTitle
  );

  if (!execution.success) {
    throw new Error(`Phase execution failed: ${execution.reflection}`);
  }

  // Select and execute tools for this phase
  const tools = await selectToolsForPhase(phaseName, phaseNote);
  const toolResults: string[] = [];

  for (const toolName of tools) {
    try {
      const result = await executeTool(toolName, { query: phaseNote });
      if (result.success) {
        toolResults.push(`**${toolName}:** ${result.result.substring(0, 200)}`);
      }
    } catch (e) {
      console.warn(`[Agent] Tool ${toolName} failed:`, e);
    }
  }

  // Record decision and learning
  await logDecision(
    taskId,
    phaseIndex,
    phaseName,
    execution.reflection,
    tools
  );

  await recordLearning(
    taskId,
    `Phase ${phaseName} completed with ${tools.length} tools`,
    "strategy"
  );
}

async function handlePhaseError(
  taskId: number,
  phaseIndex: number,
  error: Error,
  userId: number
): Promise<void> {
  const task = await getTaskById(taskId);
  const phaseName = AGENT_PHASES[phaseIndex];

  // Count existing errors for this phase
  const errorMsg = error.message || "Unknown error";
  let attempt = 1;

  // Try up to 3 times with adaptive planning
  for (let tryNum = 1; tryNum <= 3; tryNum++) {
    attempt = tryNum;
    try {
      // On second attempt, try to adapt the plan
      if (tryNum === 2) {
        const adaptedPlan = await adaptPlanAfterFailure(
          taskId,
          phaseIndex,
          errorMsg,
          Array.from(AGENT_PHASES)
        );
        console.log(`[Agent] Adapted plan after failure:`, adaptedPlan.reasoning);
        await recordLearning(
          taskId,
          `Adapted strategy after failure: ${adaptedPlan.reasoning}`,
          "strategy"
        );
      }

      await executePhase(taskId, phaseIndex, task?.title || "", errorMsg);
      await updatePhaseStatus(taskId, phaseIndex, "completed", `Recovered after ${tryNum} attempts`);
      await logError(taskId, errorMsg, tryNum, `Recovered on attempt ${tryNum}`);
      return;
    } catch (retryError: any) {
      await logError(taskId, retryError.message, tryNum);
      if (tryNum < 3) await new Promise((r) => setTimeout(r, 5000 * tryNum));
    }
  }

  // All 3 attempts failed — escalate
  await updatePhaseStatus(taskId, phaseIndex, "error", `Failed after 3 attempts: ${errorMsg}`);
  await updateTaskStatus(taskId, "error", phaseIndex);
  await logError(taskId, errorMsg, 3, "Escalated to user after 3 failed attempts");

  // Notify owner of critical error
  try {
    await notifyOwner({
      title: `🚨 Handoff: Critical Error`,
      content: `Task "${task?.title}" (ID: ${taskId}) failed at phase "${phaseName}" after 3 attempts.\n\nError: ${errorMsg}\n\nUser intervention required.`,
    });
  } catch (e) {
    console.warn("[Agent] Failed to send error notification:", e);
  }
}

async function updateProgressFile(taskId: number, note: string): Promise<void> {
  const progress = await getMemoryFile(taskId, "progress");
  const current = progress?.content || "";
  await updateMemoryFile(
    taskId,
    "progress",
    current + `\n\n### ${new Date().toISOString()}\n${note}`
  );
}

// ─── Chat with Agent ──────────────────────────────────────────────────────────

export async function chatWithAgent(
  taskId: number,
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<string> {
  const task = await getTaskById(taskId);
  const memFiles = await Promise.all([
    getMemoryFile(taskId, "task_plan"),
    getMemoryFile(taskId, "findings"),
    getMemoryFile(taskId, "progress"),
  ]);

  const [taskPlan, findings, progress] = memFiles;

  const systemPrompt = `You are Handoff, an autonomous AI agent assistant. You are helping with the task: "${task?.title}".

Your memory files:
--- task_plan.md ---
${taskPlan?.content?.substring(0, 600) || "No plan yet"}
--- findings.md ---
${findings?.content?.substring(0, 400) || "No findings yet"}
--- progress.md ---
${progress?.content?.substring(0, 400) || "No progress yet"}

Respond helpfully and concisely. Use markdown formatting. Show your reasoning step by step when relevant.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...chatHistory.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await invokeLLM({ messages });
  const content = response.choices[0]?.message?.content;
  return (typeof content === 'string' ? content : JSON.stringify(content)) || "I couldn't generate a response.";
}
