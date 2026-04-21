import { useEffect, useRef, useState } from "react";
import { StreamEvent, formatStreamEvent } from "@/lib/streaming";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface StreamingViewerProps {
  events: StreamEvent[];
  isConnected: boolean;
  title?: string;
}

export function StreamingViewer({
  events,
  isConnected,
  title = "Agent Reasoning",
}: StreamingViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, autoScroll]);

  const getEventColor = (type: StreamEvent["type"]) => {
    switch (type) {
      case "thinking":
        return "bg-blue-900/30 border-blue-500/50";
      case "action":
        return "bg-yellow-900/30 border-yellow-500/50";
      case "finding":
        return "bg-purple-900/30 border-purple-500/50";
      case "progress":
        return "bg-green-900/30 border-green-500/50";
      case "tool_start":
        return "bg-orange-900/30 border-orange-500/50";
      case "tool_result":
        return "bg-emerald-900/30 border-emerald-500/50";
      case "error":
        return "bg-red-900/30 border-red-500/50";
      case "complete":
        return "bg-cyan-900/30 border-cyan-500/50";
      default:
        return "bg-gray-900/30 border-gray-500/50";
    }
  };

  const getEventIcon = (type: StreamEvent["type"]) => {
    switch (type) {
      case "thinking":
        return "🧠";
      case "action":
        return "⚡";
      case "finding":
        return "🔍";
      case "progress":
        return "📊";
      case "tool_start":
        return "🔧";
      case "tool_result":
        return "✅";
      case "error":
        return "❌";
      case "complete":
        return "✨";
      default:
        return "•";
    }
  };

  return (
    <Card className="w-full h-full flex flex-col bg-slate-950 border-slate-800">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          {isConnected && (
            <Badge variant="outline" className="bg-green-900/50 border-green-500/50 text-green-300">
              Live
            </Badge>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4"
          />
          Auto-scroll
        </label>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              Waiting for events...
            </div>
          ) : (
            events.map((event, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getEventColor(event.type)} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-300 uppercase">
                        {event.type}
                      </span>
                      {event.phaseName && (
                        <Badge variant="secondary" className="text-xs">
                          {event.phaseName}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500 ml-auto">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 break-words">
                      {event.content}
                    </p>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-slate-400 space-y-1">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-mono text-slate-500">{key}:</span>
                            <span className="font-mono">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-slate-800 text-xs text-slate-500">
        {events.length} events • {isConnected ? "Connected" : "Disconnected"}
      </div>
    </Card>
  );
}
