/**
 * Agent Tools System
 * Provides tools for the agent to execute tasks: web search, code analysis, calculations, etc.
 */

import axios from "axios";
import { invokeLLM } from "./_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolResult {
  toolName: string;
  success: boolean;
  result: string;
  duration: number;
  error?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

// ─── Web Search Tool ──────────────────────────────────────────────────────────

export async function searchWeb(query: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Use Manus built-in API for web search
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a web search assistant. Search for information about: "${query}"
          
Return results in JSON format:
{
  "results": [
    { "title": "...", "url": "...", "snippet": "...", "source": "..." }
  ],
  "summary": "..."
}`,
        },
        {
          role: "user",
          content: `Search for: ${query}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    return {
      toolName: "web_search",
      success: true,
      result: contentStr,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      toolName: "web_search",
      success: false,
      result: "",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

// ─── Code Analysis Tool ───────────────────────────────────────────────────────

export async function analyzeCode(code: string, language: string = "typescript"): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a code analysis expert. Analyze the following ${language} code and provide:
1. Code quality assessment
2. Security vulnerabilities
3. Performance issues
4. Best practices violations
5. Suggestions for improvement

Return as JSON:
{
  "quality": number,
  "vulnerabilities": [...],
  "performance_issues": [...],
  "best_practices": [...],
  "suggestions": [...]
}`,
        },
        {
          role: "user",
          content: `Analyze this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    return {
      toolName: "code_analysis",
      success: true,
      result: contentStr,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      toolName: "code_analysis",
      success: false,
      result: "",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

// ─── Data Analysis Tool ───────────────────────────────────────────────────────

export async function analyzeData(
  data: string,
  analysisType: string = "general"
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a data analysis expert. Perform ${analysisType} analysis on the provided data.
          
Return results in JSON:
{
  "summary": "...",
  "insights": [...],
  "patterns": [...],
  "anomalies": [...],
  "recommendations": [...]
}`,
        },
        {
          role: "user",
          content: `Analyze this data:\n${data}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    return {
      toolName: "data_analysis",
      success: true,
      result: contentStr,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      toolName: "data_analysis",
      success: false,
      result: "",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

// ─── Calculation Tool ─────────────────────────────────────────────────────────

export async function performCalculation(
  expression: string
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a mathematical calculation expert. Solve the following mathematical problem step by step.
          
Return results in JSON:
{
  "expression": "...",
  "steps": [...],
  "result": number,
  "explanation": "..."
}`,
        },
        {
          role: "user",
          content: `Solve: ${expression}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    return {
      toolName: "calculation",
      success: true,
      result: contentStr,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      toolName: "calculation",
      success: false,
      result: "",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

// ─── URL Content Extraction ───────────────────────────────────────────────────

export async function extractUrlContent(url: string): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // Extract main content (simplified)
    const content = response.data
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 2000);

    return {
      toolName: "url_extraction",
      success: true,
      result: content,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      toolName: "url_extraction",
      success: false,
      result: "",
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

// ─── Tool Execution Router ────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  params: Record<string, any>
): Promise<ToolResult> {
  switch (toolName) {
    case "web_search":
      return searchWeb(params.query || "");

    case "code_analysis":
      return analyzeCode(params.code || "", params.language || "typescript");

    case "data_analysis":
      return analyzeData(params.data || "", params.type || "general");

    case "calculation":
      return performCalculation(params.expression || "");

    case "url_extraction":
      return extractUrlContent(params.url || "");

    default:
      return {
        toolName,
        success: false,
        result: "",
        duration: 0,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

// ─── Tool Selection ───────────────────────────────────────────────────────────

export async function selectToolsForPhase(
  phaseName: string,
  phaseGoal: string
): Promise<string[]> {
  const prompt = `Given this phase of an autonomous agent task, which tools would be most useful?

Phase: ${phaseName}
Goal: ${phaseGoal}

Available tools:
- web_search: Search the web for information
- code_analysis: Analyze code for quality, security, performance
- data_analysis: Analyze data for patterns and insights
- calculation: Perform mathematical calculations
- url_extraction: Extract content from URLs

Return JSON: { "tools": ["tool1", "tool2", ...], "reasoning": "..." }`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a tool selection expert. Respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "tool_selection",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tools: { type: "array", items: { type: "string" } },
              reasoning: { type: "string" },
            },
            required: ["tools", "reasoning"],
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
      return parsed.tools || [];
    }
  } catch (e) {
    console.error("[Tools] Failed to select tools:", e);
  }

  return [];
}
