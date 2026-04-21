import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Plus, Zap, Search, BookOpen, FolderOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ManusSidebar() {
  const [location, navigate] = useLocation();
  const { logout } = useAuth();

  const mainItems = [
    { icon: Plus, label: "Nueva tarea", href: "/tasks/new", id: "new-task" },
    // TODO: Implementar Agent, Buscar, Biblioteca
    // { icon: Zap, label: "Agent", href: "/agent", id: "agent" },
    // { icon: Search, label: "Buscar", href: "/search", id: "search" },
    // { icon: BookOpen, label: "Biblioteca", href: "/library", id: "library" },
  ];

  const projects = [
    { name: "Handoff", id: "handoff" },
  ];

  const recentTasks = [
    { name: "Analiza el código de H...", id: "task-1" },
  ];

  return (
    <div className="w-56 bg-[#1a1a1a] border-r border-[#333] flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-3 py-3 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          <span className="font-semibold text-white text-sm truncate">handoff</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-auto">
        <div className="px-3 py-4 space-y-2">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-[#333] text-white"
                    : "text-[#999] hover:text-white hover:bg-[#2a2a2a]"
                )}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Proyectos Section */}
        <div className="px-3 py-4 border-t border-[#333]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#666] uppercase">Proyectos</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-[#333]"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {projects.map((project) => (
              <button
                key={project.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#ccc] hover:bg-[#2a2a2a] transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Todas las tareas Section */}
        <div className="px-3 py-4 border-t border-[#333]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#666] uppercase">Todas las tareas</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-[#333]"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {recentTasks.map((task) => (
              <button
                key={task.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#ccc] hover:bg-[#2a2a2a] transition-colors truncate"
              >
                <span className="truncate">{task.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom - User & Logout */}
      <div className="border-t border-[#333] p-3 space-y-2">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#ccc] hover:bg-[#2a2a2a] transition-colors">
          <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
            S
          </div>
          <span className="truncate">SummAcademy</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2 text-[#999] hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
