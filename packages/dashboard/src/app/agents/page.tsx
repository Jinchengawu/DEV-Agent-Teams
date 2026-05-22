'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Agent {
  id: string
  name: string
  description: string
  port: number
  status: 'online' | 'offline' | 'error'
  skills: string[]
  requests: number
  uptime: string
  icon: string
}

const agents: Agent[] = [
  {
    id: 'frontend',
    name: 'Frontend Agent',
    description: 'React/Vue/TypeScript/CSS development specialist',
    port: 8201,
    status: 'online',
    skills: ['react-development', 'vue-development', 'nextjs-development', 'css-tailwind', 'typescript-best-practices'],
    requests: 127,
    uptime: '2h 34m',
    icon: '🎨',
  },
  {
    id: 'backend',
    name: 'Backend Agent',
    description: 'Python/Node.js/Go/API/Database development specialist',
    port: 8202,
    status: 'online',
    skills: ['python-development', 'nodejs-development', 'go-development', 'api-design', 'database-design'],
    requests: 89,
    uptime: '2h 34m',
    icon: '⚙️',
  },
  {
    id: 'testing',
    name: 'Testing Agent',
    description: 'pytest/Jest/Playwright/E2E testing specialist',
    port: 8203,
    status: 'online',
    skills: ['pytest-development', 'jest-development', 'vitest', 'playwright', 'e2e-testing'],
    requests: 45,
    uptime: '2h 34m',
    icon: '🧪',
  },
  {
    id: 'devops',
    name: 'DevOps Agent',
    description: 'Docker/K8s/CI-CD/Monitoring specialist',
    port: 8204,
    status: 'online',
    skills: ['docker-management', 'kubernetes-deployment', 'ci-cd-pipeline', 'monitoring-setup', 'terraform-iac'],
    requests: 23,
    uptime: '2h 34m',
    icon: '🚀',
  },
]

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 mt-1">Manage and monitor your AI agents</p>
        </div>
        <Button>+ Add Agent</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-2 space-y-4">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedAgent?.id === agent.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              onClick={() => setSelectedAgent(agent)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">{agent.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-500">{agent.description}</p>
                    </div>
                  </div>
                  <Badge variant={agent.status === 'online' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Port</p>
                    <p className="font-mono font-semibold text-lg">{agent.port}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Requests</p>
                    <p className="font-semibold text-lg">{agent.requests}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Uptime</p>
                    <p className="font-semibold text-lg">{agent.uptime}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                    {agent.skills.length > 3 && (
                      <Badge variant="outline">+{agent.skills.length - 3}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent Detail */}
        <div className="lg:col-span-1">
          {selectedAgent ? (
            <Card className="sticky top-24">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">{selectedAgent.icon}</span>
                  </div>
                  <div>
                    <CardTitle>{selectedAgent.name}</CardTitle>
                    <p className="text-sm text-gray-500">Port {selectedAgent.port}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-900">{selectedAgent.description}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">All Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.skills.map((skill) => (
                      <Badge key={skill} variant="default">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button className="w-full">
                    💬 Open Chat
                  </Button>
                  <Button variant="outline" className="w-full">
                    📋 View Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-4">👈</div>
                <p>Select an agent to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
