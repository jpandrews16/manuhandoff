/**
 * Advanced Reasoning Engine for Handoff
 * Implements Chain-of-Thought, reflection, adaptive planning, and tool integration
 */

import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import {
  getMemoryFile,
  updateMemoryFile,
  getTaskById,
} from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThinkingStep {
  step: number;
  type: "analysis" | "reasoning" | "planning" | "decision" | "reflection";
  content: string;
  timestamp: string;
}

export interface PhaseExecution {
  phaseIndex: number;
  phaseName: string;
  thinking: ThinkingStep[];
  actions: string[];
  findings: string;
  reflection: string;
  success: boolean;
  duration: number;
}

export interface AdaptivePlan {
  originalPhases: string[];
  currentPhases: string[];
  adjustments: string[];
  reasoning: string;
}

// ─── Chain-of-Thought Reasoning ────────────────────────────────────────────────

export async function generateChainOfThought(
  taskTitle: string,
  taskDescription: string,
  context: string
): Promise<ThinkingStep[]> {
  const prompt = `You are Handoff, an autonomous AI agent. Analyze this task deeply and show your complete chain of thought.

Task: "${taskTitle}"
Description: ${taskDescription}
Context: ${context}

Show your reasoning in 5-7 clear thinking steps. For each step:
1. Identify what you're analyzing
2. Consider multiple approaches
3. Evaluate pros/cons
4. Make a decision
5. Explain your reasoning

Format as JSON array with objects: { "step": number, "type": "analysis|reasoning|planning|decision|reflection", "content": "..." }`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a deep reasoning AI. Always respond with valid JSON. Show complete chain of thought.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "chain_of_thought",
          strict: true,
          schema: {
            type: "object",
            properties: {
              thinking: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    step: { type: "number" },
                    type: {
                      type: "string",
                      enum: [
                        "analysis",
                        "reasoning",
                        "planning",
                        "decision",
                        "reflection",
                      ],
                    },
                    content: { type: "string" },
                  },
                  required: ["step", "type", "content"],
                },
              },
            },
            required: ["thinking"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content =
      typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.thinking)) {
        return parsed.thinking.map((step: any) => ({
          ...step,
          timestamp: new Date().toISOString(),
        }));
      }
    }
  } catch (e) {
    console.error("[Reasoning] Failed to generate chain of thought:", e);
  }

  return [];
}

// ─── Phase Execution with Deep Reasoning ──────────────────────────────────────

export async function executePhaseWithReasoning(
  taskId: number,
  phaseIndex: number,
  phaseName: string,
  phaseGoal: string,
  taskTitle: string
): Promise<PhaseExecution> {
  const startTime = Date.now();
  const thinking: ThinkingStep[] = [];
  const actions: string[] = [];

  try {
    // Step 1: Analyze phase requirements
    const analysisPrompt = `You are executing phase "${phaseName}" of task: "${taskTitle}"
Goal: ${phaseGoal}

First, deeply analyze what this phase requires. Show your analysis in JSON format:
{ "analysis": "...", "requirements": [...], "approach": "..." }`;

    const analysisResponse = await invokeLLM({
      messages: [
        { role: "system", content: "You are a deep analysis AI." },
        { role: "user", content: analysisPrompt },
      ],
    });

    const analysisContent = analysisResponse.choices[0]?.message?.content;
    const analysisText =
      typeof analysisContent === "string"
        ? analysisContent
        : JSON.stringify(analysisContent);

    thinking.push({
      step: 1,
      type: "analysis",
      content: analysisText,
      timestamp: new Date().toISOString(),
    });

    // Step 2: Load memory and context
    const memFiles = await Promise.all([
      getMemoryFile(taskId, "task_plan"),
      getMemoryFile(taskId, "findings"),
      getMemoryFile(taskId, "progress"),
    ]);

    const [taskPlan, findings, progress] = memFiles;
    const memoryContext = `
--- Task Plan ---
${taskPlan?.content?.substring(0, 400) || ""}
--- Findings ---
${findings?.content?.substring(0, 300) || ""}
--- Progress ---
${progress?.content?.substring(0, 300) || ""}`;

    // Step 3: Develop strategy
    const strategyPrompt = `Based on the analysis, develop a concrete strategy for this phase.
Memory context:
${memoryContext}

Provide strategy in JSON: { "strategy": "...", "steps": [...], "tools": [...] }`;

    const strategyResponse = await invokeLLM({
      messages: [
        { role: "system", content: "You are a strategic planner." },
        { role: "user", content: strategyPrompt },
      ],
    });

    const strategyContent = strategyResponse.choices[0]?.message?.content;
    const strategyText =
      typeof strategyContent === "string"
        ? strategyContent
        : JSON.stringify(strategyContent);

    thinking.push({
      step: 2,
      type: "planning",
      content: strategyText,
      timestamp: new Date().toISOString(),
    });

    // Step 4: Execute with detailed reasoning
    const executionPrompt = `Execute phase "${phaseName}" with detailed reasoning.
Strategy: ${strategyText}

Provide execution details in JSON:
{ "execution": "...", "findings": "...", "decisions": [...], "reasoning": "..." }`;

    const executionResponse = await invokeLLM({
      messages: [
        { role: "system", content: "You are executing a task phase." },
        { role: "user", content: executionPrompt },
      ],
    });

    const executionContent = executionResponse.choices[0]?.message?.content;
    const executionText =
      typeof executionContent === "string"
        ? executionContent
        : JSON.stringify(executionContent);

    thinking.push({
      step: 3,
      type: "decision",
      content: executionText,
      timestamp: new Date().toISOString(),
    });

    // Step 5: Reflection and evaluation
    const reflectionPrompt = `Reflect on the phase execution. Did we achieve the goal?
Goal: ${phaseGoal}
Execution: ${executionText}

Provide reflection in JSON:
{ "achieved": boolean, "success_rate": number, "learnings": [...], "improvements": [...] }`;

    const reflectionResponse = await invokeLLM({
      messages: [
        { role: "system", content: "You are reflecting on task execution." },
        { role: "user", content: reflectionPrompt },
      ],
    });

    const reflectionContent = reflectionResponse.choices[0]?.message?.content;
    const reflectionText =
      typeof reflectionContent === "string"
        ? reflectionContent
        : JSON.stringify(reflectionContent);

    thinking.push({
      step: 4,
      type: "reflection",
      content: reflectionText,
      timestamp: new Date().toISOString(),
    });

    // Update memory with execution details
    const executionRecord = `
## Phase ${phaseIndex + 1}: ${phaseName}
**Goal:** ${phaseGoal}
**Duration:** ${Date.now() - startTime}ms

### Thinking Process
${thinking.map((t) => `- **${t.type}:** ${t.content.substring(0, 150)}`).join("\n")}

### Execution Details
${executionText}

### Reflection
${reflectionText}`;

    const currentProgress = progress?.content || "";
    await updateMemoryFile(
      taskId,
      "progress",
      currentProgress + "\n\n" + executionRecord
    );

    return {
      phaseIndex,
      phaseName,
      thinking,
      actions,
      findings: executionText,
      reflection: reflectionText,
      success: true,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error(`[Reasoning] Phase execution failed:`, error);
    return {
      phaseIndex,
      phaseName,
      thinking,
      actions,
      findings: "",
      reflection: `Error during execution: ${error.message}`,
      success: false,
      duration: Date.now() - startTime,
    };
  }
}

// ─── Adaptive Planning ─────────────────────────────────────────────────────────

export async function adaptPlanAfterFailure(
  taskId: number,
  failedPhaseIndex: number,
  failureReason: string,
  originalPhases: string[]
): Promise<AdaptivePlan> {
  const task = await getTaskById(taskId);

  const prompt = `A phase failed during task execution. Adapt the plan intelligently.

Task: "${task?.title}"
Failed Phase: ${originalPhases[failedPhaseIndex]} (index ${failedPhaseIndex})
Failure Reason: ${failureReason}
Remaining Phases: ${originalPhases.slice(failedPhaseIndex + 1).join(", ")}

Provide adapted plan in JSON:
{
  "currentPhases": [...],
  "adjustments": ["..."],
  "reasoning": "...",
  "retryStrategy": "..."
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an adaptive planning AI. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "adaptive_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              currentPhases: { type: "array", items: { type: "string" } },
              adjustments: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
              retryStrategy: { type: "string" },
            },
            required: [
              "currentPhases",
              "adjustments",
              "reasoning",
              "retryStrategy",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content =
      typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    if (content) {
      const parsed = JSON.parse(content);
      return {
        originalPhases,
        currentPhases: parsed.currentPhases || originalPhases,
        adjustments: parsed.adjustments || [],
        reasoning: parsed.reasoning || "",
      };
    }
  } catch (e) {
    console.error("[Reasoning] Failed to adapt plan:", e);
  }

  return {
    originalPhases,
    currentPhases: originalPhases,
    adjustments: [],
    reasoning: "Could not adapt plan, continuing with original",
  };
}

// ─── Decision Logging ─────────────────────────────────────────────────────────

export async function logDecision(
  taskId: number,
  phaseIndex: number,
  decision: string,
  rationale: string,
  alternatives: string[]
): Promise<void> {
  const decisionRecord = `
## Decision at Phase ${phaseIndex + 1}
**Decision:** ${decision}
**Rationale:** ${rationale}
**Alternatives Considered:**
${alternatives.map((alt) => `- ${alt}`).join("\n")}
**Timestamp:** ${new Date().toISOString()}`;

  const taskPlan = await getMemoryFile(taskId, "task_plan");
  const current = taskPlan?.content || "";

  // Find and update the Decisions Made section
  const updatedPlan = current.replace(
    /## Decisions Made[\s\S]*?\|[\s\S]*?\|/,
    `## Decisions Made\n| Decision | Rationale |\n|----------|-----------|`
  );

  await updateMemoryFile(taskId, "task_plan", updatedPlan + decisionRecord);
}

// ─── Learning System ──────────────────────────────────────────────────────────

export async function recordLearning(
  taskId: number,
  learning: string,
  category: "pattern" | "strategy" | "pitfall" | "optimization"
): Promise<void> {
  // Record learning for future optimization
  const learningRecord = `
## Learning: ${category.toUpperCase()}
- ${learning}
- Recorded: ${new Date().toISOString()}`;

  const progress = await getMemoryFile(taskId, "progress");
  const current = progress?.content || "";

  await updateMemoryFile(taskId, "progress", current + learningRecord);
}
