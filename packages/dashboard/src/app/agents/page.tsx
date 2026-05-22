'use client'

import { useState } from 'react'

interface Agent {
  id: string
  name: string
  description: string
  port: number
  status: 'online' | 'offline' | 'error'
  skills: string[]
  requests: number
  uptime: string
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
  },
]

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
          + Add Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-2 space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow ${
                selectedAgent?.id === agent.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{agent.description}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  agent.status === 'online' ? 'bg-green-100 text-green-800' :
                  agent.status === 'offline' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {agent.status}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Port</span>
                  <p className="font-mono font-medium">{agent.port}</p>
                </div>
                <div>
                  <span className="text-gray-500">Requests</span>
                  <p className="font-medium">{agent.requests}</p>
                </div>
                <div>
                  <span className="text-gray-500">Uptime</span>
                  <p className="font-medium">{agent.uptime}</p>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-sm text-gray-500">Skills:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {agent.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {skill}
                    </span>
                  ))}
                  {agent.skills.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{agent.skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agent Detail */}
        <div className="lg:col-span-1">
          {selectedAgent ? (
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedAgent.name}</h2>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Description</span>
                  <p className="text-gray-900">{selectedAgent.description}</p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Port</span>
                  <p className="font-mono text-gray-900">{selectedAgent.port}</p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">All Skills</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedAgent.skills.map((skill) => (
                      <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg mb-2">
                    Open Chat
                  </button>
                  <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg">
                    View Logs
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              <p>Select an agent to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
