import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Play,
  Send,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { ReasoningPanel } from "@/components/ReasoningPanel";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

const AGENT_PHASES = ["Analizar", "Pensar", "Seleccionar", "Ejecutar", "Observar", "Iterar", "Entregar"];

const PHASE_ICONS = ["🔍", "🧠", "🎯", "⚡", "👁️", "🔄", "📦"];

type PhaseStatus = "pending" | "active" | "completed" | "error";

function PhaseStep({
  index,
  name,
  status,
  notes,
  isLast,
}: {
  index: number;
  name: string;
  status: PhaseStatus;
  notes?: string | null;
  isLast: boolean;
}) {
  const isActive = status === "active";
  const isCompleted = status === "completed";
  const isError = status === "error";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 transition-all duration-500 ${
            isActive
              ? "bg-primary text-primary-foreground phase-active"
              : isCompleted
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : isError
                  ? "bg-destructive/20 text-destructive border border-destructive/30"
                  : "bg-secondary text-muted-foreground border border-border"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isError ? (
            <XCircle className="w-4 h-4" />
          ) : isActive ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span className="text-xs">{PHASE_ICONS[index]}</span>
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 mt-1 min-h-[20px] transition-colors duration-500 ${
              isCompleted ? "bg-green-500/30" : "bg-border"
            }`}
          />
        )}
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-sm font-medium ${
              isActive ? "text-primary" : isCompleted ? "text-green-400" : isError ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {name}
          </span>
          {isActive && (
            <Badge variant="default" className="text-xs py-0 animate-pulse">
              Activo
            </Badge>
          )}
        </div>
        {notes && (
          <p className="text-xs text-muted-foreground leading-relaxed">{notes}</p>
        )}
      </div>
    </div>
  );
}

function ChatMessage({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
        }`}
      >
        {isUser ? "U" : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
          isUser
            ? "bg-primary/15 text-foreground rounded-tr-sm"
            : "bg-secondary text-foreground rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <Streamdown className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_pre]:bg-background/50 [&_code]:text-primary [&_code]:font-mono [&_code]:text-xs">
            {content}
          </Streamdown>
        )}
      </div>
    </div>
  );
}

export default function TaskDetail() {
  const { isAuthenticated, loading } = useAuth();
  const params = useParams<{ taskId: string }>();
  const taskId = parseInt(params.taskId ?? "0");
  const [, navigate] = useLocation();
  const [chatInput, setChatInput] = useState("");
  const [activeMemoryFile, setActiveMemoryFile] = useState<"task_plan" | "findings" | "progress">("task_plan");
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: task, isLoading: taskLoading } = trpc.tasks.get.useQuery(
    { taskId },
    { enabled: isAuthenticated && taskId > 0, refetchInterval: 2000 }
  );

  const { data: phases } = trpc.agent.getPhases.useQuery(
    { taskId },
    { enabled: isAuthenticated && taskId > 0, refetchInterval: 2000 }
  );

  const { data: chatMessages, isLoading: chatLoading } = trpc.chat.getMessages.useQuery(
    { taskId },
    { enabled: isAuthenticated && taskId > 0, refetchInterval: 3000 }
  );

  const { data: memoryFile } = trpc.memory.getFile.useQuery(
    { taskId, fileType: activeMemoryFile },
    { enabled: isAuthenticated && taskId > 0, refetchInterval: 3000 }
  );

  const { data: errorLogs } = trpc.errors.list.useQuery(
    { taskId },
    { enabled: isAuthenticated && taskId > 0 }
  );

  const startLoop = trpc.agent.startLoop.useMutation({
    onSuccess: () => {
      toast.success("Agente iniciado. Ejecutando el loop...");
      utils.tasks.get.invalidate({ taskId });
      utils.agent.getPhases.invalidate({ taskId });
    },
    onError: (err) => toast.error(err.message),
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setChatInput("");
      utils.chat.getMessages.invalidate({ taskId });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const updateMemory = trpc.memory.updateFile.useMutation({
    onSuccess: () => {
      toast.success("Archivo actualizado");
      setEditingContent(null);
      utils.memory.getFile.invalidate({ taskId, fileType: activeMemoryFile });
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: exportData } = trpc.memory.exportAll.useQuery(
    { taskId },
    { enabled: isAuthenticated && taskId > 0 }
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (loading || taskLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Tarea no encontrada</p>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const sortedPhases = phases?.sort((a, b) => a.phaseIndex - b.phaseIndex) ?? [];
  const progress = Math.round((task.currentPhaseIndex / task.totalPhases) * 100);

  const handleExport = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} descargado`);
  };

  const handleExportAll = () => {
    if (!exportData) return;
    exportData.forEach(({ filename, content }) => handleExport(filename, content));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-40">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">Handoff</span>
          </div>
        </div>
        <nav className="flex-1 p-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
        </nav>
      </div>

      {/* Main */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{task.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                {task.status === "running" && <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />}
                {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                {task.status === "error" && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                {task.status === "pending" && <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                {task.status === "paused" && <Clock className="w-3.5 h-3.5 text-yellow-500" />}
                <span className="text-xs text-muted-foreground capitalize">{task.status}</span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {task.status !== "running" && task.status !== "completed" && (
              <Button
                size="sm"
                onClick={() => startLoop.mutate({ taskId })}
                disabled={startLoop.isPending}
                className="glow-primary"
              >
                {startLoop.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                {task.status === "error" ? "Reintentar" : "Iniciar Agente"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleExportAll}>
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Agent Loop */}
          <div className="w-72 border-r border-border p-5 overflow-y-auto flex-shrink-0">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Loop del Agente
            </h2>
            <div>
              {sortedPhases.length > 0
                ? sortedPhases.map((phase, i) => (
                    <PhaseStep
                      key={phase.id}
                      index={phase.phaseIndex}
                      name={phase.name}
                      status={phase.status as PhaseStatus}
                      notes={phase.notes}
                      isLast={i === sortedPhases.length - 1}
                    />
                  ))
                : AGENT_PHASES.map((name, i) => (
                    <PhaseStep
                      key={name}
                      index={i}
                      name={name}
                      status="pending"
                      isLast={i === AGENT_PHASES.length - 1}
                    />
                  ))}
            </div>
          </div>

          {/* Right: Tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-4 mt-3 bg-secondary/50 w-fit">
                <TabsTrigger value="chat" className="gap-1.5 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="memory" className="gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  Memoria
                </TabsTrigger>
                <TabsTrigger value="errors" className="gap-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Errores {errorLogs && errorLogs.length > 0 && `(${errorLogs.length})`}
                </TabsTrigger>
                <TabsTrigger value="reasoning" className="gap-1.5 text-xs">
                  🧠 Reasoning
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5 text-xs">
                  📊 Analytics
                </TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 mt-0 p-4 pt-3">
                <ScrollArea className="flex-1 pr-2">
                  <div className="space-y-4 pb-2">
                    {chatLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                    ) : chatMessages && chatMessages.length > 0 ? (
                      chatMessages
                        .filter((m) => m.role !== "system")
                        .map((msg) => (
                          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                        ))
                    ) : (
                      <div className="text-center py-12">
                        <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Inicia el agente o escribe un mensaje para comenzar
                        </p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe un mensaje al agente..."
                    className="min-h-[60px] max-h-[120px] bg-secondary/50 border-border resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (chatInput.trim() && !sendMessage.isPending) {
                          sendMessage.mutate({ taskId, message: chatInput.trim() });
                        }
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => {
                      if (chatInput.trim()) {
                        sendMessage.mutate({ taskId, message: chatInput.trim() });
                      }
                    }}
                    disabled={!chatInput.trim() || sendMessage.isPending}
                    className="self-end glow-primary"
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Reasoning Tab */}
              <TabsContent value="reasoning" className="flex-1 flex flex-col overflow-hidden m-0 p-4 pt-3">
                <ReasoningPanel taskId={taskId} />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="flex-1 flex flex-col overflow-hidden m-0 p-4 pt-3">
                <AnalyticsDashboard taskId={taskId} />
              </TabsContent>

              {/* Memory Tab */}
              <TabsContent value="memory" className="flex-1 flex flex-col overflow-hidden m-0 p-4 pt-3">
                <div className="flex items-center gap-2 mb-3">
                  {(["task_plan", "findings", "progress"] as const).map((ft) => (
                    <button
                      key={ft}
                      onClick={() => {
                        setActiveMemoryFile(ft);
                        setEditingContent(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeMemoryFile === ft
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {ft === "task_plan" ? "task_plan.md" : ft === "findings" ? "findings.md" : "progress.md"}
                    </button>
                  ))}
                  <div className="ml-auto flex gap-2">
                    {editingContent !== null ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingContent(null)}
                          className="text-xs h-7"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateMemory.mutate({
                              taskId,
                              fileType: activeMemoryFile,
                              content: editingContent,
                            })
                          }
                          disabled={updateMemory.isPending}
                          className="text-xs h-7"
                        >
                          {updateMemory.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingContent(memoryFile?.content ?? "")}
                          className="text-xs h-7"
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (memoryFile) {
                              const filename =
                                activeMemoryFile === "task_plan"
                                  ? "task_plan.md"
                                  : activeMemoryFile === "findings"
                                    ? "findings.md"
                                    : "progress.md";
                              handleExport(filename, memoryFile.content);
                            }
                          }}
                          className="text-xs h-7"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {editingContent !== null ? (
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="min-h-[400px] font-mono text-xs bg-secondary/30 border-border resize-none"
                    />
                  ) : (
                    <div className="bg-secondary/30 rounded-lg p-4">
                      <Streamdown className="prose prose-invert prose-sm max-w-none [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_pre]:bg-background/50 [&_code]:text-primary [&_code]:font-mono [&_code]:text-xs [&_table]:text-xs">
                        {memoryFile?.content ?? "Cargando..."}
                      </Streamdown>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Errors Tab */}
              <TabsContent value="errors" className="flex-1 overflow-auto m-0 p-4 pt-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Registro de Errores — Protocolo de 3 Intentos
                </h3>
                {errorLogs && errorLogs.length > 0 ? (
                  <div className="space-y-2">
                    {errorLogs.map((err) => (
                      <div
                        key={err.id}
                        className={`glass-card rounded-lg p-4 ${
                          err.escalated ? "border-destructive/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                err.attempt === 1
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : err.attempt === 2
                                    ? "bg-orange-500/20 text-orange-400"
                                    : "bg-destructive/20 text-destructive"
                              }`}
                            >
                              {err.attempt}
                            </div>
                            <span className="text-xs font-medium">Intento {err.attempt}/3</span>
                            {err.escalated === 1 && (
                              <Badge variant="destructive" className="text-xs py-0">
                                Escalado
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(err.createdAt).toLocaleString("es")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono bg-background/50 rounded p-2 mb-2">
                          {err.error}
                        </p>
                        {err.resolution && (
                          <p className="text-xs text-green-400">
                            ✓ {err.resolution}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Sin errores registrados</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
