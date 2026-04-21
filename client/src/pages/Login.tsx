import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

type Mode = "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => navigate("/"),
    onError: (e) => setError(e.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => navigate("/"),
    onError: (e) => setError(e.message),
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, name: name || undefined });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Handoff</h1>
        <p className="text-[#666] text-center mb-8 text-sm">Tu agente AI autónomo</p>

        <div className="flex mb-6 rounded-lg overflow-hidden border border-[#333]">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "login" ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-white"}`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "register" ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-white"}`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm text-[#999] mb-1">Nombre (opcional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-[#555] focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-[#999] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-[#555] focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-[#999] mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Tu contraseña"}
              minLength={mode === "register" ? 8 : 1}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white placeholder-[#555] focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
          >
            {isPending
              ? "..."
              : mode === "login"
              ? "Entrar"
              : "Crear cuenta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
