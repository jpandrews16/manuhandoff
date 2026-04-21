/**
 * Multi-Format Input Support
 * Handles images, audio, URLs, and text inputs for agent tasks
 */

import axios from "axios";
import { invokeLLM } from "./_core/llm";

export type InputFormat = "text" | "image" | "audio" | "url";

export interface MultiFormatInput {
  format: InputFormat;
  content: string; // URL for image/audio/url, text for text
  metadata?: {
    filename?: string;
    mimeType?: string;
    size?: number;
  };
}

export interface ProcessedInput {
  text: string;
  format: InputFormat;
  summary?: string;
  metadata: Record<string, any>;
}

/**
 * Process multi-format input and convert to text representation
 */
export async function processMultiFormatInput(input: MultiFormatInput): Promise<ProcessedInput> {
  switch (input.format) {
    case "text":
      return {
        text: input.content,
        format: "text",
        metadata: input.metadata || {},
      };

    case "image":
      return await processImageInput(input);

    case "audio":
      return await processAudioInput(input);

    case "url":
      return await processUrlInput(input);

    default:
      throw new Error(`Unsupported input format: ${input.format}`);
  }
}

/**
 * Process image input using LLM vision
 */
async function processImageInput(input: MultiFormatInput): Promise<ProcessedInput> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: input.content,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "Analyze this image and provide a detailed description of what you see. Include text, objects, colors, composition, and any relevant details.",
            },
          ],
        },
      ],
    });

    const text =
      typeof response.choices[0]?.message.content === "string"
        ? response.choices[0].message.content
        : "";

    return {
      text,
      format: "image",
      summary: text.substring(0, 200),
      metadata: {
        imageUrl: input.content,
        filename: input.metadata?.filename,
        mimeType: input.metadata?.mimeType || "image/jpeg",
      },
    };
  } catch (error) {
    throw new Error(`Failed to process image: ${error}`);
  }
}

/**
 * Process audio input using transcription
 */
async function processAudioInput(input: MultiFormatInput): Promise<ProcessedInput> {
  try {
    // Use Manus transcription API
    const { transcribeAudio } = await import("./_core/voiceTranscription");

    const result = await transcribeAudio({
      audioUrl: input.content,
      language: "es",
    });

    const text = typeof result === "object" && "text" in result ? (result as any).text : "";
    const language = typeof result === "object" && "language" in result ? (result as any).language : "es";

    return {
      text: text || "",
      format: "audio",
      summary: text?.substring(0, 200),
      metadata: {
        audioUrl: input.content,
        language,
        filename: input.metadata?.filename,
        mimeType: input.metadata?.mimeType || "audio/mpeg",
      },
    };
  } catch (error) {
    throw new Error(`Failed to process audio: ${error}`);
  }
}

/**
 * Process URL input - fetch and extract content
 */
async function processUrlInput(input: MultiFormatInput): Promise<ProcessedInput> {
  try {
    const response = await axios.get(input.content, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const html = response.data;

    // Extract text content using LLM
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "user",
          content: `Extract and summarize the main content from this HTML. Focus on the key information, headings, and important text. Ignore navigation, ads, and boilerplate.\n\nHTML:\n${html.substring(0, 5000)}`,
        },
      ],
    });

    const text =
      typeof llmResponse.choices[0]?.message.content === "string"
        ? llmResponse.choices[0].message.content
        : "";

    return {
      text,
      format: "url",
      summary: text.substring(0, 200),
      metadata: {
        url: input.content,
        contentType: response.headers["content-type"],
        statusCode: response.status,
        contentLength: response.headers["content-length"],
      },
    };
  } catch (error) {
    throw new Error(`Failed to process URL: ${error}`);
  }
}

/**
 * Validate input format and content
 */
export function validateInput(input: MultiFormatInput): { valid: boolean; error?: string } {
  if (!input.format) {
    return { valid: false, error: "Input format is required" };
  }

  if (!input.content) {
    return { valid: false, error: "Input content is required" };
  }

  // Validate format-specific requirements
  if (input.format === "url") {
    try {
      new URL(input.content);
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  if (input.format === "image" || input.format === "audio") {
    if (!input.content.startsWith("http://") && !input.content.startsWith("https://")) {
      return { valid: false, error: `${input.format} must be a URL` };
    }
  }

  return { valid: true };
}

/**
 * Get supported formats
 */
export function getSupportedFormats(): InputFormat[] {
  return ["text", "image", "audio", "url"];
}
