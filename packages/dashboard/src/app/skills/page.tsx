'use client'

import { useState } from 'react'

interface Skill {
  id: string
  name: string
  category: string
  description: string
  agent: string
}

const skills: Skill[] = [
  // Frontend
  { id: '1', name: 'react-development', category: 'frontend', description: 'React component development best practices', agent: 'Frontend Agent' },
  { id: '2', name: 'vue-development', category: 'frontend', description: 'Vue 3 Composition API development', agent: 'Frontend Agent' },
  { id: '3', name: 'nextjs-development', category: 'frontend', description: 'Next.js full-stack development', agent: 'Frontend Agent' },
  { id: '4', name: 'css-tailwind', category: 'frontend', description: 'Tailwind CSS styling', agent: 'Frontend Agent' },
  { id: '5', name: 'typescript-best-practices', category: 'frontend', description: 'TypeScript best practices', agent: 'Frontend Agent' },
  // Backend
  { id: '6', name: 'python-development', category: 'backend', description: 'Python/FastAPI development', agent: 'Backend Agent' },
  { id: '7', name: 'nodejs-development', category: 'backend', description: 'Node.js/Express development', agent: 'Backend Agent' },
  { id: '8', name: 'go-development', category: 'backend', description: 'Go/Gin development', agent: 'Backend Agent' },
  { id: '9', name: 'api-design', category: 'backend', description: 'RESTful API design', agent: 'Backend Agent' },
  { id: '10', name: 'database-design', category: 'backend', description: 'Database schema design', agent: 'Backend Agent' },
  // Testing
  { id: '11', name: 'pytest-development', category: 'testing', description: 'Python pytest testing', agent: 'Testing Agent' },
  { id: '12', name: 'jest-development', category: 'testing', description: 'JavaScript Jest testing', agent: 'Testing Agent' },
  { id: '13', name: 'vitest', category: 'testing', description: 'Vitest modern testing', agent: 'Testing Agent' },
  { id: '14', name: 'playwright', category: 'testing', description: 'Playwright E2E testing', agent: 'Testing Agent' },
  { id: '15', name: 'e2e-testing', category: 'testing', description: 'End-to-end testing', agent: 'Testing Agent' },
  // DevOps
  { id: '16', name: 'docker-management', category: 'devops', description: 'Docker containerization', agent: 'DevOps Agent' },
  { id: '17', name: 'kubernetes-deployment', category: 'devops', description: 'Kubernetes deployment', agent: 'DevOps Agent' },
  { id: '18', name: 'ci-cd-pipeline', category: 'devops', description: 'CI/CD pipeline setup', agent: 'DevOps Agent' },
  { id: '19', name: 'monitoring-setup', category: 'devops', description: 'Prometheus/Grafana monitoring', agent: 'DevOps Agent' },
  { id: '20', name: 'terraform-iac', category: 'devops', description: 'Terraform infrastructure', agent: 'DevOps Agent' },
]

export default function SkillsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = ['all', 'frontend', 'backend', 'testing', 'devops']

  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
        <span className="text-sm text-gray-500">{skills.length} skills available</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex space-x-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => (
          <div key={skill.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-gray-900">{skill.name}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                skill.category === 'frontend' ? 'bg-blue-100 text-blue-800' :
                skill.category === 'backend' ? 'bg-green-100 text-green-800' :
                skill.category === 'testing' ? 'bg-yellow-100 text-yellow-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {skill.category}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{skill.description}</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-500">{skill.agent}</span>
              <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                View →
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No skills found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
