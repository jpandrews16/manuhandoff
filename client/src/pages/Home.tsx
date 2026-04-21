import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Paperclip, Image, Zap } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const TASK_SUGGESTIONS = [
  {
    icon: "🔐",
    title: "Crear diapositivas",
    description: "Automatiza tu flujo de trabajo con diapositivas personalizadas",
  },
  {
    icon: "🌐",
    title: "Crear sitio web",
    description: "Diseña y desarrolla sitios web profesionales",
  },
  {
    icon: "⚙️",
    title: "Desarrollar aplicaciones",
    description: "Crea aplicaciones de escritorio con herramientas modernas",
  },
  {
    icon: "🎨",
    title: "Diseño",
    description: "Diseña interfaces y experiencias visuales",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [taskInput, setTaskInput] = useState("");
  const createTaskMutation = trpc.tasks.create.useMutation();

  const handleCreateTask = async () => {
    if (!taskInput.trim()) return;
    
    try {
      const task = await createTaskMutation.mutateAsync({
        title: taskInput.substring(0, 100),
        description: taskInput,
      });
      navigate(`/tasks/${task.taskId}`);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#999]">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Bienvenido a Handoff</h1>
          <p className="text-[#999] mb-6">Inicia sesión para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Title */}
        <h1 className="text-5xl font-bold text-white mb-8 text-center max-w-2xl">
          ¿Qué puedo hacer por ti?
        </h1>

        {/* Input Area */}
        <div className="w-full max-w-2xl space-y-4">
          {/* Textarea */}
          <div className="relative">
            <Textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleCreateTask();
                }
              }}
              placeholder="Asigna una tarea o pregunta cualquier cosa"
              className="w-full min-h-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-white placeholder-[#666] resize-none focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Tool Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 hover:bg-[#333] text-[#999]"
              title="Agregar archivo"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 hover:bg-[#333] text-[#999]"
              title="Adjuntar archivo"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 hover:bg-[#333] text-[#999]"
              title="Subir imagen"
            >
              <Image className="w-5 h-5" />
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-[#333] text-[#999]"
                title="Más opciones"
              >
                <Zap className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={!taskInput.trim() || createTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10"
              >
                {createTaskMutation.isPending ? "Creando..." : "Crear"}
              </Button>
            </div>
          </div>

          {/* Connection Info */}
          <div className="flex items-center gap-2 text-sm text-[#666] px-2">
            <Zap className="w-4 h-4" />
            <span>Conecta tus herramientas a Handoff</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Suggestions */}
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-2 gap-3">
            {TASK_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setTaskInput(suggestion.title)}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 hover:border-blue-500 transition-colors text-left group"
              >
                <div className="text-2xl mb-2">{suggestion.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-blue-400">
                  {suggestion.title}
                </h3>
                <p className="text-xs text-[#666]">{suggestion.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
