'use client'

import { useState, useEffect, useCallback } from 'react'

interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  assignee: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  task_type: string
  progress: number
  due_at: string | null
  created_at: string
  updated_at: string
  source?: 'local' | 'coordination'
  project_id?: string
  document_count?: number
}

interface Milestone {
  id: string
  title: string
  description: string
  status: string
  target_date: string
  progress: number
}

interface KanbanData {
  tasks: Task[]
  milestones: Milestone[]
  agent_stats: Record<string, { total: number; todo: number; in_progress: number; done: number; blocked: number }>
  summary: {
    total_tasks: number
    completed: number
    blocked: number
    overdue: number
    active_milestones: number
  }
}

const STATUS_COLUMNS = [
  { key: 'todo', label: '待办', color: 'bg-slate-100', badge: 'bg-slate-500' },
  { key: 'in_progress', label: '进行中', color: 'bg-blue-50', badge: 'bg-blue-500' },
  { key: 'review', label: '评审中', color: 'bg-purple-50', badge: 'bg-purple-500' },
  { key: 'done', label: '已完成', color: 'bg-green-50', badge: 'bg-green-500' },
  { key: 'blocked', label: '阻塞', color: 'bg-red-50', badge: 'bg-red-500' },
] as const

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
} as const

const AGENT_ICONS: Record<string, string> = {
  'dev-frontend': '🎨',
  'dev-backend': '⚙️',
  'dev-testing': '🧪',
  'dev-devops': '🚀',
  'dev-pm': '📋',
  'project-admin': '📊',
}

export default function KanbanPage() {
  const [data, setData] = useState<KanbanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee: 'dev-frontend', priority: 'medium' })

  const fetchKanban = useCallback(() => {
    fetch('/api/kanban')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchKanban() }, [fetchKanban])

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return
    await fetch('/api/kanban/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
    setNewTask({ title: '', description: '', assignee: 'dev-frontend', priority: 'medium' })
    setShowCreate(false)
    fetchKanban()
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await fetch(`/api/kanban/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchKanban()
  }

  const handleDeleteTask = async (taskId: string) => {
    await fetch(`/api/kanban/tasks/${taskId}`, { method: 'DELETE' })
    fetchKanban()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-64 bg-gray-200 rounded"></div>)}
          </div>
        </div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📋 项目看板</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + 新建任务
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{summary?.total_tasks ?? 0}</div>
          <div className="text-xs text-gray-500">总任务</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{summary?.completed ?? 0}</div>
          <div className="text-xs text-gray-500">已完成</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{(summary?.total_tasks ?? 0) - (summary?.completed ?? 0) - (summary?.blocked ?? 0)}</div>
          <div className="text-xs text-gray-500">进行中</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{summary?.blocked ?? 0}</div>
          <div className="text-xs text-gray-500">阻塞</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{summary?.overdue ?? 0}</div>
          <div className="text-xs text-gray-500">逾期</div>
        </div>
      </div>

      {/* Create Task Form */}
      {showCreate && (
        <div className="bg-white rounded-lg shadow p-4 border border-blue-200">
          <div className="grid grid-cols-4 gap-4">
            <input
              placeholder="任务标题"
              value={newTask.title}
              onChange={e => setNewTask({...newTask, title: e.target.value})}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              placeholder="描述（可选）"
              value={newTask.description}
              onChange={e => setNewTask({...newTask, description: e.target.value})}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={newTask.assignee}
              onChange={e => setNewTask({...newTask, assignee: e.target.value})}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="dev-frontend">🎨 Frontend</option>
              <option value="dev-backend">⚙️ Backend</option>
              <option value="dev-testing">🧪 Testing</option>
              <option value="dev-devops">🚀 DevOps</option>
              <option value="dev-pm">📋 PM</option>
              <option value="project-admin">📊 Project Admin</option>
            </select>
            <div className="flex gap-2">
              <select
                value={newTask.priority}
                onChange={e => setNewTask({...newTask, priority: e.target.value})}
                className="px-3 py-2 border rounded-lg text-sm flex-1"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">紧急</option>
              </select>
              <button onClick={handleCreateTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {STATUS_COLUMNS.map(col => {
          const tasks = (data?.tasks ?? []).filter(t => t.status === col.key)
          return (
            <div key={col.key} className={`${col.color} rounded-lg p-3`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`${col.badge} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>{tasks.length}</span>
                <h3 className="font-semibold text-sm text-gray-700">{col.label}</h3>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {tasks.map(task => (
                  <div key={task.id} className="bg-white rounded-lg shadow-sm p-3 text-sm" data-testid={`kanban-task-${task.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900 leading-tight">{task.title}</span>
                      {task.source !== 'coordination' && (
                        <button onClick={() => handleDeleteTask(task.id)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-gray-400">{task.id}</p>
                    {task.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                    {task.source === 'coordination' && (
                      <div className="mt-2 rounded border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
                        <div className="flex flex-wrap items-center gap-1">
                          <span>Pipeline 协作任务</span>
                          <span>·</span>
                          <span>{task.document_count ?? 0} 篇文档</span>
                        </div>
                        {task.project_id && (
                          <a
                            href={`/knowledge?projectId=${encodeURIComponent(task.project_id)}&taskId=${encodeURIComponent(task.id)}`}
                            className="mt-1 inline-flex font-mono hover:underline"
                            data-testid={`kanban-task-docs-${task.id}`}
                          >
                            文档: {task.project_id}
                          </a>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs">{AGENT_ICONS[task.assignee] ?? '🤖'}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                    </div>
                    {/* Status change buttons */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {STATUS_COLUMNS.filter(c => c.key !== task.status).slice(0, 2).map(c => (
                        <button
                          key={c.key}
                          onClick={() => handleStatusChange(task.id, c.key)}
                          className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && <div className="text-xs text-gray-400 text-center py-8">暂无任务</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Milestones */}
      {(data?.milestones ?? []).length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">🎯 里程碑</h2>
          <div className="space-y-3">
            {(data?.milestones ?? []).map(ms => (
              <div key={ms.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ms.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ms.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {ms.status}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${ms.progress}%` }}></div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">目标: {ms.target_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Stats */}
      {data?.agent_stats && Object.keys(data.agent_stats).length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-gray-900 mb-3">👥 Agent 工作量</h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(data.agent_stats).map(([agent, stats]) => (
              <div key={agent} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <span className="text-xl">{AGENT_ICONS[agent] ?? '🤖'}</span>
                <div>
                  <div className="text-sm font-medium">{agent}</div>
                  <div className="text-xs text-gray-500">{stats.total} 任务 · {stats.done} 完成</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
