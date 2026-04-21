import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

const AGENT_PHASES = ["Analizar", "Pensar", "Seleccionar", "Ejecutar", "Observar", "Iterar", "Entregar"];

export default function NewTask() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [generatedPhases, setGeneratedPhases] = useState<string[]>([]);

  const [createdTaskId, setCreatedTaskId] = useState<number | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const startLoop = trpc.agent.startLoop.useMutation({
    onSuccess: () => {
      toast.success("¡Agente iniciado! Ejecutando el loop...");
      navigate(`/tasks/${createdTaskId}`);
    },
    onError: () => {
      navigate(`/tasks/${createdTaskId}`);
    },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: (data) => {
      setCreatedTaskId(data.taskId);
      setGeneratedPhases(data.phaseNotes);
      setGeneratingPlan(false);
      // Auto-launch agent
      startLoop.mutate({ taskId: data.taskId });
    },
    onError: (err) => {
      toast.error(`Error al crear la tarea: ${err.message}`);
      setIsCreating(false);
      setGeneratingPlan(false);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsCreating(true);
    setGeneratingPlan(true);
    setGeneratedPhases([]);

    // Extract title (first line) and description (rest)
    const lines = input.trim().split("\n");
    const title = lines[0]?.substring(0, 200) ?? input.substring(0, 200);
    const description = lines.slice(1).join("\n").trim() || undefined;

    createTask.mutate({ title, description });
  };

  const exampleTasks = [
    "Analiza las tendencias de mercado de IA en 2025 y crea un informe ejecutivo",
    "Diseña una arquitectura de microservicios para una app de e-commerce con alta disponibilidad",
    "Investiga los mejores frameworks de testing para React y recomienda el más adecuado",
    "Crea un plan de contenido para redes sociales de una startup de fintech",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar (simplified) */}
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
            Volver al Dashboard
          </button>
        </nav>
      </div>

      {/* Main */}
      <div className="ml-60 p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Nueva Tarea</h1>
          <p className="text-sm text-muted-foreground">
            Describe tu tarea en lenguaje natural. El agente la descompondrá automáticamente en 7 fases.
          </p>
        </div>

        {/* Input */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Describe tu tarea</span>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: Analiza las tendencias de IA en 2025 y crea un informe ejecutivo con recomendaciones estratégicas..."
            className="min-h-[140px] bg-secondary/50 border-border resize-none text-sm leading-relaxed"
            disabled={isCreating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              {input.length}/512 · Ctrl+Enter para enviar
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isCreating}
              className="glow-primary"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando tarea...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Crear y planificar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Agent Loop Preview */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold mb-4">
            {generatingPlan ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Generando plan de fases con IA...
              </span>
            ) : generatedPhases.length > 0 ? (
              "Plan generado por el agente:"
            ) : (
              "El agente ejecutará estas 7 fases:"
            )}
          </h3>
          <div className="space-y-2">
            {AGENT_PHASES.map((phase, i) => (
              <div key={phase} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                  generatedPhases.length > 0 ? 'border-primary/40 bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{phase}</span>
                  {generatedPhases[i] && (
                    <p className="text-xs text-muted-foreground mt-0.5">{generatedPhases[i]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Examples */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Ejemplos de tareas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exampleTasks.map((example) => (
              <button
                key={example}
                onClick={() => setInput(example)}
                disabled={isCreating}
                className="text-left p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
