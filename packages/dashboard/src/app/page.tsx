'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function Dashboard() {
  const stats = [
    { title: "Total Requests", value: "284", icon: "📊", change: "+12%", color: "from-blue-500 to-blue-600" },
    { title: "Success Rate", value: "98.5%", icon: "✅", change: "+2.1%", color: "from-green-500 to-green-600" },
    { title: "Avg Response", value: "1.2s", icon: "⚡", change: "-0.3s", color: "from-yellow-500 to-orange-500" },
    { title: "Active Tasks", value: "3", icon: "🔄", change: "+1", color: "from-purple-500 to-purple-600" },
  ]

  const agents = [
    { id: "frontend", name: "Frontend Agent", port: 8201, status: "online", skills: 9, requests: 127, icon: "🎨" },
    { id: "backend", name: "Backend Agent", port: 8202, status: "online", skills: 9, requests: 89, icon: "⚙️" },
    { id: "testing", name: "Testing Agent", port: 8203, status: "online", skills: 10, requests: 45, icon: "🧪" },
    { id: "devops", name: "DevOps Agent", port: 8204, status: "online", skills: 10, requests: 23, icon: "🚀" },
  ]

  const recentActivity = [
    { time: "2 min ago", agent: "Frontend Agent", action: "Created React login component", icon: "🎨" },
    { time: "5 min ago", agent: "Backend Agent", action: "Designed user API endpoint", icon: "⚙️" },
    { time: "8 min ago", agent: "Testing Agent", action: "Generated unit tests for auth module", icon: "🧪" },
    { time: "12 min ago", agent: "DevOps Agent", action: "Created Dockerfile for deployment", icon: "🚀" },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agent Status</CardTitle>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                      <span className="text-xl">{agent.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-xs text-gray-500">Port {agent.port}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Online</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">Skills</p>
                    <p className="font-semibold">{agent.skills}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <p className="text-gray-500 text-xs">Requests</p>
                    <p className="font-semibold">{agent.requests}</p>
                  </div>
                </div>
                
                <Button className="w-full mt-3" size="sm">
                  Open Chat
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">🆕</span>
                <span className="font-medium">New Project</span>
                <span className="text-xs text-gray-500">Start a new project</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📋</span>
                <span className="font-medium">Templates</span>
                <span className="text-xs text-gray-500">Browse templates</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">📚</span>
                <span className="font-medium">Skills</span>
                <span className="text-xs text-gray-500">View all skills</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">⚙️</span>
                <span className="font-medium">Settings</span>
                <span className="text-xs text-gray-500">Configure system</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-lg">{activity.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.agent}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
