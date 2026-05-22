'use client'

import { useEffect, useState } from 'react'

interface AgentStatus {
  id: string
  name: string
  port: number
  status: 'online' | 'offline' | 'error'
  skills: number
  requests: number
}

export default function Dashboard() {
  const [agents, setAgents] = useState<AgentStatus[]>([
    { id: 'frontend', name: 'Frontend Agent', port: 8201, status: 'online', skills: 9, requests: 127 },
    { id: 'backend', name: 'Backend Agent', port: 8202, status: 'online', skills: 9, requests: 89 },
    { id: 'testing', name: 'Testing Agent', port: 8203, status: 'online', skills: 10, requests: 45 },
    { id: 'devops', name: 'DevOps Agent', port: 8204, status: 'online', skills: 10, requests: 23 },
  ])

  const [stats, setStats] = useState({
    totalRequests: 284,
    successRate: 98.5,
    avgResponseTime: 1.2,
    activeTasks: 3,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'offline': return 'bg-gray-400'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.successRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.avgResponseTime}s</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">🔄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Agent Status</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{agent.name}</h3>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Port:</span>
                    <span className="font-mono">{agent.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Skills:</span>
                    <span>{agent.skills}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Requests:</span>
                    <span>{agent.requests}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded">
                    Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <span className="text-2xl mb-2 block">🆕</span>
              <span className="font-medium text-gray-900 block">New Project</span>
              <span className="text-sm text-gray-500">Start a new project</span>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <span className="text-2xl mb-2 block">📋</span>
              <span className="font-medium text-gray-900 block">Templates</span>
              <span className="text-sm text-gray-500">Browse templates</span>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <span className="text-2xl mb-2 block">📚</span>
              <span className="font-medium text-gray-900 block">Skills</span>
              <span className="text-sm text-gray-500">View all skills</span>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <span className="text-2xl mb-2 block">⚙️</span>
              <span className="font-medium text-gray-900 block">Settings</span>
              <span className="text-sm text-gray-500">Configure system</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { time: '2 min ago', agent: 'Frontend Agent', action: 'Created React login component', status: 'success' },
              { time: '5 min ago', agent: 'Backend Agent', action: 'Designed user API endpoint', status: 'success' },
              { time: '8 min ago', agent: 'Testing Agent', action: 'Generated unit tests for auth module', status: 'success' },
              { time: '12 min ago', agent: 'DevOps Agent', action: 'Created Dockerfile for deployment', status: 'success' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.agent}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
