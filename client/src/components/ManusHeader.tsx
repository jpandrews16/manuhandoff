import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ManusHeader() {
  return (
    <div className="h-14 bg-[#0a0a0a] border-b border-[#333] flex items-center justify-between px-6">
      {/* Left - Logo & Version */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">H</span>
        </div>
        <span className="text-xs font-medium text-white">Handoff 1.0</span>
        <ChevronDown className="w-3 h-3 text-[#666]" />
      </div>

      {/* Right - Notifications & Credits */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 hover:bg-[#333]"
        >
          <Bell className="w-4 h-4 text-[#999]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>
        
        <div className="flex items-center gap-1 px-3 py-1 rounded bg-[#1a1a1a] border border-[#333]">
          <span className="text-xs text-[#999]">⚡</span>
          <span className="text-sm font-medium text-white">334</span>
        </div>
      </div>
    </div>
  );
}
