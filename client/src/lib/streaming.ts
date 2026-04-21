/**
 * Streaming Client for Real-time Agent Execution
 * Handles SSE connections and event parsing
 */

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

export type StreamEventHandler = (event: StreamEvent) => void;

export class StreamingClient {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, StreamEventHandler[]> = new Map();

  /**
   * Connect to a streaming endpoint
   */
  connect(url: string, onEvent?: StreamEventHandler): void {
    this.eventSource = new EventSource(url, {
      withCredentials: true,
    });

    this.eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit("message", data);

        if (onEvent) {
          onEvent(data);
        }

        // Emit type-specific events
        this.emit(data.type, data);
      } catch (e) {
        console.error("[Streaming] Failed to parse event:", e);
      }
    });

    this.eventSource.addEventListener("error", () => {
      this.emit("error", { message: "Connection error" });
      this.disconnect();
    });
  }

  /**
   * Disconnect from streaming endpoint
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Subscribe to specific event types
   */
  on(eventType: string, handler: StreamEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit event to all subscribers
   */
  private emit(eventType: string, data: any): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

/**
 * Hook for streaming agent loop
 */
export function useAgentStreamLoop(
  taskId: number,
  onEvent: (event: StreamEvent) => void
): {
  start: () => void;
  stop: () => void;
  isConnected: boolean;
} {
  let client: StreamingClient | null = null;
  let isConnected = false;

  const start = () => {
    client = new StreamingClient();
    client.connect(`/api/stream/task/${taskId}/loop`, onEvent);
    isConnected = true;
  };

  const stop = () => {
    if (client) {
      client.disconnect();
      client = null;
      isConnected = false;
    }
  };

  return {
    start,
    stop,
    isConnected,
  };
}

/**
 * Hook for streaming chat response
 */
export function useStreamingChat(
  taskId: number,
  onEvent: (event: StreamEvent) => void
): {
  sendMessage: (message: string) => Promise<void>;
  isConnected: boolean;
} {
  let isConnected = false;

  const sendMessage = async (message: string) => {
    try {
      const response = await fetch(`/api/stream/task/${taskId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              onEvent(event);
            } catch (e) {
              console.error("[Streaming] Failed to parse event:", e);
            }
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }

      isConnected = false;
    } catch (error) {
      console.error("[Streaming] Chat error:", error);
      onEvent({
        type: "error",
        content: `Chat error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return {
    sendMessage,
    isConnected,
  };
}

/**
 * Format streaming event for display
 */
export function formatStreamEvent(event: StreamEvent): string {
  switch (event.type) {
    case "thinking":
      return `🧠 Thinking: ${event.content}`;
    case "action":
      return `⚡ Action: ${event.content}`;
    case "finding":
      return `🔍 Finding: ${event.content}`;
    case "progress":
      return `📊 Progress: ${event.content}`;
    case "tool_start":
      return `🔧 Tool: Starting ${event.metadata?.toolName}`;
    case "tool_result":
      return `✅ Tool: ${event.metadata?.toolName} - ${event.content.substring(0, 100)}`;
    case "error":
      return `❌ Error: ${event.content}`;
    case "complete":
      return `✨ Complete: ${event.content}`;
    default:
      return event.content;
  }
}
