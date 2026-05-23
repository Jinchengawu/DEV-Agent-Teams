'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function Dashboard() {
  const stats = [
    { title: "Total Requests", value: "12,847", change: "+12.5%", trend: "up", icon: "📊", color: "bg-blue-500" },
    { title: "Success Rate", value: "99.2%", change: "+0.3%", trend: "up", icon: "✅", color: "bg-green-500" },
    { title: "Avg Response", value: "0.8s", change: "-0.2s", trend: "down", icon: "⚡", color: "bg-yellow-500" },
    { title: "Active Agents", value: "4", change: "+1", trend: "up", icon: "🤖", color: "bg-purple-500" },
  ]

  const agents = [
    { id: "frontend", name: "Frontend Agent", status: "online", cpu: 45, memory: 62, requests: 3241, icon: "🎨" },
    { id: "backend", name: "Backend Agent", status: "online", cpu: 38, memory: 58, requests: 2891, icon: "⚙️" },
    { id: "testing", name: "Testing Agent", status: "online", cpu: 22, memory: 45, requests: 1567, icon: "🧪" },
    { id: "devops", name: "DevOps Agent", status: "online", cpu: 15, memory: 32, requests: 892, icon: "🚀" },
  ]

  const recentLogs = [
    { time: "14:32:15", level: "INFO", message: "Frontend Agent: Created React component", agent: "frontend" },
    { time: "14:31:42", level: "INFO", message: "Backend Agent: API endpoint designed", agent: "backend" },
    { time: "14:31:18", level: "WARN", message: "Testing Agent: High memory usage detected", agent: "testing" },
    { time: "14:30:55", level: "INFO", message: "DevOps Agent: Docker image built", agent: "devops" },
    { time: "14:30:22", level: "ERROR", message: "Frontend Agent: Build failed", agent: "frontend" },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Monitor your AI agents and system performance</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Agent
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className={`text-sm mt-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <span className="text-xl text-white">{stat.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Agent Status</CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <span className="text-xl">{agent.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{agent.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={agent.status === 'online' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                          <span className="text-xs text-gray-500">{agent.requests} requests</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">CPU</p>
                        <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${agent.cpu}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-700 mt-1">{agent.cpu}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Memory</p>
                        <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                          <div 
                            className="h-2 bg-green-500 rounded-full" 
                            style={{ width: `${agent.memory}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-700 mt-1">{agent.memory}%</p>
                      </div>
                      <Button variant="ghost" size="sm">Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Logs</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.map((log, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={
                      log.level === 'ERROR' ? 'destructive' :
                      log.level === 'WARN' ? 'secondary' : 'outline'
                    } className="text-xs">
                      {log.level}
                    </Badge>
                    <span className="text-xs text-gray-400">{log.time}</span>
                  </div>
                  <p className="text-sm text-gray-700">{log.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Performance chart will be rendered here</p>
              <p className="text-sm">Integration with Recharts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
