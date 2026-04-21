import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AnalyticsDashboardProps {
  taskId?: number;
}

export function AnalyticsDashboard({ taskId }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch analytics data
  const taskMetricsQuery = taskId
    ? trpc.analytics.getTaskMetrics.useQuery({ taskId })
    : { data: null, isLoading: false };

  const userAnalyticsQuery = trpc.analytics.getUserAnalytics.useQuery();
  const trendsQuery = trpc.analytics.getPerformanceTrends.useQuery();
  const cacheStatsQuery = trpc.analytics.getCacheStats.useQuery();

  const errorAnalyticsQuery = taskId
    ? trpc.analytics.getErrorAnalysis.useQuery({ taskId })
    : { data: null, isLoading: false };

  const engagementQuery = taskId
    ? trpc.analytics.getEngagementMetrics.useQuery({ taskId })
    : { data: null, isLoading: false };

  return (
    <Card className="w-full bg-slate-950 border-slate-800">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-slate-800 bg-slate-900/50 p-0">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            📊 Overview
          </TabsTrigger>
          {taskId && (
            <>
              <TabsTrigger
                value="task"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                🎯 Task Metrics
              </TabsTrigger>
              <TabsTrigger
                value="errors"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                ⚠️ Errors
              </TabsTrigger>
              <TabsTrigger
                value="engagement"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                💬 Engagement
              </TabsTrigger>
            </>
          )}
          <TabsTrigger
            value="trends"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            📈 Trends
          </TabsTrigger>
          <TabsTrigger
            value="cache"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
          >
            ⚡ Cache
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4">
          {userAnalyticsQuery.isLoading ? (
            <div className="text-slate-400">Loading analytics...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Total Tasks</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {userAnalyticsQuery.data?.totalTasks || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Completed</div>
                  <div className="text-2xl font-bold text-green-400">
                    {userAnalyticsQuery.data?.completedTasks || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-400">
                    {userAnalyticsQuery.data?.failedTasks || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">Success Rate</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {userAnalyticsQuery.data?.successRate || "0"}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-2">Total Execution Time</div>
                  <div className="text-lg text-slate-200">
                    {userAnalyticsQuery.data?.totalExecutionTime || "0 min"}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-xs text-slate-400 mb-2">Avg Task Duration</div>
                  <div className="text-lg text-slate-200">
                    {userAnalyticsQuery.data?.avgTaskDuration || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {taskId && (
          <>
            <TabsContent value="task" className="p-4">
              {taskMetricsQuery.isLoading ? (
                <div className="text-slate-400">Loading task metrics...</div>
              ) : taskMetricsQuery.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                      <div className="text-xs text-slate-400 mb-1">Phases Completed</div>
                      <div className="text-2xl font-bold text-blue-400">
                        {taskMetricsQuery.data.completedPhases}/{taskMetricsQuery.data.totalPhases}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                      <div className="text-xs text-slate-400 mb-1">Success Rate</div>
                      <div className="text-2xl font-bold text-green-400">
                        {taskMetricsQuery.data.successRate}%
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-900/20 border border-orange-500/30">
                      <div className="text-xs text-slate-400 mb-1">Execution Time</div>
                      <div className="text-2xl font-bold text-orange-400">
                        {taskMetricsQuery.data.executionTime}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                      <div className="text-xs text-slate-400 mb-1">Total Errors</div>
                      <div className="text-2xl font-bold text-red-400">
                        {taskMetricsQuery.data.totalErrors}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                      <div className="text-xs text-slate-400 mb-1">Chat Messages</div>
                      <div className="text-2xl font-bold text-purple-400">
                        {taskMetricsQuery.data.chatMessages}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                      <div className="text-xs text-slate-400 mb-1">Avg Per Phase</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {taskMetricsQuery.data.avgTimePerPhase}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="errors" className="p-4">
              {errorAnalyticsQuery.isLoading ? (
                <div className="text-slate-400">Loading error analysis...</div>
              ) : errorAnalyticsQuery.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Total Errors</div>
                      <div className="text-2xl font-bold text-red-400">
                        {errorAnalyticsQuery.data.totalErrors}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Recovered</div>
                      <div className="text-2xl font-bold text-green-400">
                        {errorAnalyticsQuery.data.recoveredErrors}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Recovery Rate</div>
                      <div className="text-2xl font-bold text-blue-400">
                        {errorAnalyticsQuery.data.recoveryRate}%
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {errorAnalyticsQuery.data.errors.map((error, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-red-900/20 border border-red-500/30"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              Attempt {error.attempt}
                            </Badge>
                            {error.resolved ? (
                              <Badge className="text-xs bg-green-900 text-green-200">
                                ✓ Resolved
                              </Badge>
                            ) : (
                              <Badge className="text-xs bg-red-900 text-red-200">
                                ✗ Escalated
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-200 mb-1">{error.error}</p>
                          <p className="text-xs text-slate-400">{error.resolution}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="engagement" className="p-4">
              {engagementQuery.isLoading ? (
                <div className="text-slate-400">Loading engagement metrics...</div>
              ) : engagementQuery.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Total Messages</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {engagementQuery.data.totalMessages}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">User Messages</div>
                      <div className="text-2xl font-bold text-blue-400">
                        {engagementQuery.data.userMessages}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Agent Messages</div>
                      <div className="text-2xl font-bold text-purple-400">
                        {engagementQuery.data.agentMessages}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Avg User Msg Length</div>
                      <div className="text-lg font-bold text-slate-200">
                        {engagementQuery.data.avgUserMessageLength} chars
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Avg Agent Msg Length</div>
                      <div className="text-lg font-bold text-slate-200">
                        {engagementQuery.data.avgAgentMessageLength} chars
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Conversation Ratio</div>
                      <div className="text-lg font-bold text-slate-200">
                        {engagementQuery.data.conversationRatio}x
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          </>
        )}

        <TabsContent value="trends" className="p-4">
          {trendsQuery.isLoading ? (
            <div className="text-slate-400">Loading trends...</div>
          ) : trendsQuery.data ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-400">Trend:</span>
                <Badge
                  variant="outline"
                  className={
                    trendsQuery.data.trend === "improving"
                      ? "bg-green-900 text-green-200"
                      : trendsQuery.data.trend === "degrading"
                        ? "bg-red-900 text-red-200"
                        : "bg-slate-700 text-slate-200"
                  }
                >
                  {trendsQuery.data.trend.toUpperCase()}
                </Badge>
              </div>

              {trendsQuery.data.trends.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendsQuery.data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="taskNumber"
                      stroke="#94a3b8"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="executionTimeMin"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              <ScrollArea className="h-48">
                <div className="space-y-2 pr-4">
                  {trendsQuery.data.trends.map((trend, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-slate-200">
                            Task {trend.taskNumber}: {trend.taskTitle}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(trend.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              trend.status === "completed"
                                ? "bg-green-900 text-green-200"
                                : trend.status === "error"
                                  ? "bg-red-900 text-red-200"
                                  : "bg-slate-700 text-slate-200"
                            }
                          >
                            {trend.status}
                          </Badge>
                          <div className="text-sm text-cyan-400 mt-1">
                            {trend.executionTimeMin} min
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="cache" className="p-4">
          {cacheStatsQuery.isLoading ? (
            <div className="text-slate-400">Loading cache stats...</div>
          ) : cacheStatsQuery.data ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Cached Entries</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {cacheStatsQuery.data.entries}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Max Size</div>
                <div className="text-2xl font-bold text-slate-300">
                  {cacheStatsQuery.data.maxSize}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Total Hits</div>
                <div className="text-2xl font-bold text-green-400">
                  {cacheStatsQuery.data.totalHits}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Total Size</div>
                <div className="text-2xl font-bold text-purple-400">
                  {cacheStatsQuery.data.totalSize}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Utilization</div>
                <div className="text-2xl font-bold text-orange-400">
                  {cacheStatsQuery.data.utilization}
                </div>
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
