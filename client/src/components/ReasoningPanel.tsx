import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReasoningPanelProps {
  taskId: number;
}

export function ReasoningPanel({ taskId }: ReasoningPanelProps) {
  const [activeTab, setActiveTab] = useState("thinking");

  // Fetch reasoning data
  const thinkingQuery = trpc.reasoning.getThinkingProcess.useQuery({ taskId });
  const decisionQuery = trpc.reasoning.getDecisionLog.useQuery({ taskId });
  const learningQuery = trpc.reasoning.getLearningLog.useQuery({ taskId });
  const adaptationsQuery = trpc.reasoning.getAdaptations.useQuery({ taskId });
  const summaryQuery = trpc.reasoning.getReasoningSummary.useQuery({ taskId });

  return (
    <Card className="w-full bg-slate-950 border-slate-800">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-slate-800 bg-slate-900/50 p-0">
          <TabsTrigger
            value="thinking"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            🧠 Thinking
          </TabsTrigger>
          <TabsTrigger
            value="decisions"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            ⚖️ Decisions
          </TabsTrigger>
          <TabsTrigger
            value="learning"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            📚 Learning
          </TabsTrigger>
          <TabsTrigger
            value="adaptations"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            🔄 Adaptations
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            📊 Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="thinking" className="p-4">
          <ScrollArea className="h-96">
            {thinkingQuery.isLoading ? (
              <div className="text-slate-400">Loading thinking process...</div>
            ) : thinkingQuery.data?.thinking.length === 0 ? (
              <div className="text-slate-500">No thinking data yet</div>
            ) : (
              <div className="space-y-3">
                {thinkingQuery.data?.thinking.map((thought, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Phase {thought.phaseIndex + 1}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(thought.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{thought.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="decisions" className="p-4">
          <ScrollArea className="h-96">
            {decisionQuery.isLoading ? (
              <div className="text-slate-400">Loading decisions...</div>
            ) : decisionQuery.data?.length === 0 ? (
              <div className="text-slate-500">No decisions recorded yet</div>
            ) : (
              <div className="space-y-3">
                {decisionQuery.data?.map((decision, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30"
                  >
                    <div className="font-semibold text-sm text-purple-300 mb-1">
                      {decision.decision}
                    </div>
                    <p className="text-sm text-slate-300">{decision.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="learning" className="p-4">
          <ScrollArea className="h-96">
            {learningQuery.isLoading ? (
              <div className="text-slate-400">Loading learnings...</div>
            ) : learningQuery.data?.length === 0 ? (
              <div className="text-slate-500">No learnings recorded yet</div>
            ) : (
              <div className="space-y-3">
                {learningQuery.data?.map((learning, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-green-900/20 border border-green-500/30"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className="text-xs capitalize"
                      >
                        {learning.category}
                      </Badge>
                      <span className="text-xs text-slate-400 ml-auto">
                        {new Date(learning.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{learning.learning}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="adaptations" className="p-4">
          <ScrollArea className="h-96">
            {adaptationsQuery.isLoading ? (
              <div className="text-slate-400">Loading adaptations...</div>
            ) : adaptationsQuery.data?.length === 0 ? (
              <div className="text-slate-500">No adaptations applied yet</div>
            ) : (
              <div className="space-y-2">
                {adaptationsQuery.data?.map((adaptation, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-orange-900/20 border border-orange-500/30"
                  >
                    <p className="text-sm text-slate-200">✓ {adaptation}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="summary" className="p-4">
          {summaryQuery.isLoading ? (
            <div className="text-slate-400">Loading summary...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Phases Completed</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {summaryQuery.data?.phasesCompleted || 0}/7
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Decisions Made</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {summaryQuery.data?.decisionsMade || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Learnings</div>
                  <div className="text-2xl font-bold text-green-400">
                    {summaryQuery.data?.learningsRecorded || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Adaptations</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {summaryQuery.data?.adaptationsApplied || 0}
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <div className="text-xs text-slate-400 mb-2">Task Status</div>
                <div className="text-sm text-slate-200">
                  <p className="mb-1">
                    <span className="text-slate-400">Title:</span>{" "}
                    {summaryQuery.data?.taskTitle}
                  </p>
                  <p className="mb-1">
                    <span className="text-slate-400">Status:</span>{" "}
                    <Badge variant="outline" className="ml-2">
                      {summaryQuery.data?.status}
                    </Badge>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Created: {summaryQuery.data?.createdAt
                      ? new Date(summaryQuery.data.createdAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
