import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, LogOut, User, Zap, CheckCircle2, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Profile() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: tasks } = trpc.tasks.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: sessions } = trpc.sessions.listByUser.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Bot className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length ?? 0;
  const activeTasks = tasks?.filter((t) => t.status === "running").length ?? 0;
  const totalSessions = sessions?.length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
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
      <div className="ml-60 p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Perfil</h1>

        {/* User card */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.name ?? "Usuario"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email ?? "Sin email"}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Autenticado con Manus OAuth</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total de tareas", value: totalTasks, icon: <Bot className="w-4 h-4" /> },
              { label: "Completadas", value: completedTasks, icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
              { label: "En ejecución", value: activeTasks, icon: <Zap className="w-4 h-4 text-primary" /> },
              { label: "Sesiones totales", value: totalSessions, icon: <Clock className="w-4 h-4 text-muted-foreground" /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-secondary/50 rounded-lg p-3 flex items-center gap-3">
                <div className="text-muted-foreground">{stat.icon}</div>
                <div>
                  <p className="text-lg font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div className="glass-card rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold mb-4">Información de cuenta</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm font-medium">{user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Método de login</span>
              <span className="text-sm font-medium">Manus OAuth</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Rol</span>
              <span className="text-sm font-medium capitalize">{user?.role ?? "user"}</span>
            </div>
          </div>
        </div>

        {/* Sessions */}
        {sessions && sessions.length > 0 && (
          <div className="glass-card rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold mb-4">Sesiones recientes</h3>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${session.isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
                    />
                    <span className="text-sm">Tarea #{session.taskId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.createdAt).toLocaleDateString("es")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6 py-0"
                      onClick={() => navigate(`/tasks/${session.taskId}`)}
                    >
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <Button
          variant="outline"
          onClick={logout}
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
