import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  LogOut,
  Plus,
  User,
  XCircle,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
type Task = {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  status: "pending" | "running" | "paused" | "completed" | "error";
  currentPhaseIndex: number;
  totalPhases: number;
  createdAt: Date;
  updatedAt: Date;
};

const STATUS_CONFIG = {
  pending: { label: "Pendiente", icon: Circle, color: "text-muted-foreground", badge: "secondary" },
  running: { label: "Ejecutando", icon: Zap, color: "text-primary", badge: "default" },
  paused: { label: "Pausado", icon: Clock, color: "text-yellow-500", badge: "outline" },
  completed: { label: "Completado", icon: CheckCircle2, color: "text-green-500", badge: "outline" },
  error: { label: "Error", icon: XCircle, color: "text-destructive", badge: "destructive" },
} as const;

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const cfg = STATUS_CONFIG[task.status];
  const Icon = cfg.icon;
  const progress = Math.round((task.currentPhaseIndex / task.totalPhases) * 100);

  return (
    <button
      onClick={onClick}
      className="w-full text-left glass-card rounded-xl p-5 hover:border-primary/40 transition-all hover:glow-primary group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color} ${task.status === "running" ? "animate-pulse" : ""}`} />
          <h3 className="font-medium truncate text-sm">{task.title}</h3>
        </div>
        <Badge variant={cfg.badge as any} className="flex-shrink-0 text-xs">
          {cfg.label}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Fase {task.currentPhaseIndex}/{task.totalPhases}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true, locale: es })}
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: tasks, isLoading: tasksLoading } = trpc.tasks.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 3000, // Poll every 3s for running tasks
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Bot className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const totalTasks = tasks?.length ?? 0;
  const activeTasks = tasks?.filter((t) => t.status === "running").length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length ?? 0;
  const errorTasks = tasks?.filter((t) => t.status === "error").length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-40">
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">Handoff</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <Zap className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => navigate("/tasks/new")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <User className="w-4 h-4" />
            Perfil
          </button>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? "Usuario"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bienvenido de vuelta, {user?.name?.split(" ")[0] ?? "Usuario"}
            </p>
          </div>
          <Button onClick={() => navigate("/tasks/new")} className="glow-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total de tareas", value: totalTasks, icon: <Bot className="w-4 h-4" />, color: "text-foreground" },
            { label: "En ejecución", value: activeTasks, icon: <Zap className="w-4 h-4" />, color: "text-primary" },
            { label: "Completadas", value: completedTasks, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-500" },
            { label: "Con errores", value: errorTasks, icon: <AlertTriangle className="w-4 h-4" />, color: "text-destructive" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-5">
              <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                {stat.icon}
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tasks list */}
        <div>
          <h2 className="text-base font-semibold mb-4">Mis Tareas</h2>

          {tasksLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Sin tareas aún</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Crea tu primera tarea y deja que el agente trabaje por ti
              </p>
              <Button onClick={() => navigate("/tasks/new")} className="glow-primary">
                <Plus className="w-4 h-4 mr-2" />
                Crear primera tarea
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
