'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Skill {
  id: string
  name: string
  category: string
  description: string
  agent: string
}

const skills: Skill[] = [
  { id: '1', name: 'react-development', category: 'frontend', description: 'React component development best practices', agent: 'Frontend Agent' },
  { id: '2', name: 'vue-development', category: 'frontend', description: 'Vue 3 Composition API development', agent: 'Frontend Agent' },
  { id: '3', name: 'nextjs-development', category: 'frontend', description: 'Next.js full-stack development', agent: 'Frontend Agent' },
  { id: '4', name: 'css-tailwind', category: 'frontend', description: 'Tailwind CSS styling', agent: 'Frontend Agent' },
  { id: '5', name: 'typescript-best-practices', category: 'frontend', description: 'TypeScript best practices', agent: 'Frontend Agent' },
  { id: '6', name: 'python-development', category: 'backend', description: 'Python/FastAPI development', agent: 'Backend Agent' },
  { id: '7', name: 'nodejs-development', category: 'backend', description: 'Node.js/Express development', agent: 'Backend Agent' },
  { id: '8', name: 'go-development', category: 'backend', description: 'Go/Gin development', agent: 'Backend Agent' },
  { id: '9', name: 'api-design', category: 'backend', description: 'RESTful API design', agent: 'Backend Agent' },
  { id: '10', name: 'database-design', category: 'backend', description: 'Database schema design', agent: 'Backend Agent' },
  { id: '11', name: 'pytest-development', category: 'testing', description: 'Python pytest testing', agent: 'Testing Agent' },
  { id: '12', name: 'jest-development', category: 'testing', description: 'JavaScript Jest testing', agent: 'Testing Agent' },
  { id: '13', name: 'vitest', category: 'testing', description: 'Vitest modern testing', agent: 'Testing Agent' },
  { id: '14', name: 'playwright', category: 'testing', description: 'Playwright E2E testing', agent: 'Testing Agent' },
  { id: '15', name: 'e2e-testing', category: 'testing', description: 'End-to-end testing', agent: 'Testing Agent' },
  { id: '16', name: 'docker-management', category: 'devops', description: 'Docker containerization', agent: 'DevOps Agent' },
  { id: '17', name: 'kubernetes-deployment', category: 'devops', description: 'Kubernetes deployment', agent: 'DevOps Agent' },
  { id: '18', name: 'ci-cd-pipeline', category: 'devops', description: 'CI/CD pipeline setup', agent: 'DevOps Agent' },
  { id: '19', name: 'monitoring-setup', category: 'devops', description: 'Prometheus/Grafana monitoring', agent: 'DevOps Agent' },
  { id: '20', name: 'terraform-iac', category: 'devops', description: 'Terraform infrastructure', agent: 'DevOps Agent' },
]

export default function SkillsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    { id: 'all', label: 'All', icon: '📚', count: skills.length },
    { id: 'frontend', label: 'Frontend', icon: '🎨', count: skills.filter(s => s.category === 'frontend').length },
    { id: 'backend', label: 'Backend', icon: '⚙️', count: skills.filter(s => s.category === 'backend').length },
    { id: 'testing', label: 'Testing', icon: '🧪', count: skills.filter(s => s.category === 'testing').length },
    { id: 'devops', label: 'DevOps', icon: '🚀', count: skills.filter(s => s.category === 'devops').length },
  ]

  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
          <p className="text-gray-500 mt-1">{skills.length} skills available across all agents</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          />
          <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-slate-200'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              selectedCategory === category.id ? 'bg-blue-500' : 'bg-gray-100'
            }`}>
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => (
          <Card key={skill.id} className="hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                <Badge variant={
                  skill.category === 'frontend' ? 'default' :
                  skill.category === 'backend' ? 'secondary' :
                  skill.category === 'testing' ? 'outline' : 'destructive'
                }>
                  {skill.category}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-4">{skill.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 flex items-center space-x-1">
                  <span>{skill.category === 'frontend' ? '🎨' : skill.category === 'backend' ? '⚙️' : skill.category === 'testing' ? '🧪' : '🚀'}</span>
                  <span>{skill.agent}</span>
                </span>
                <Button variant="ghost" size="sm">
                  View →
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500">No skills found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
