'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m DEV-Agent-Teams. I can help you with:\n\n• 🎨 Frontend development (React, Vue, TypeScript)\n• ⚙️ Backend development (Python, Node.js, Go)\n• 🧪 Testing (pytest, Jest, Playwright)\n• 🚀 DevOps (Docker, Kubernetes, CI/CD)\n\nWhat would you like to work on?',
      agent: 'System',
      timestamp: new Date(Date.now() - 60000),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateResponse(input),
        agent: detectAgent(input),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, agentMessage])
      setIsTyping(false)
    }, 1500)
  }

  const detectAgent = (message: string): string => {
    const lower = message.toLowerCase()
    if (lower.includes('react') || lower.includes('vue') || lower.includes('component') || lower.includes('ui')) {
      return 'Frontend Agent'
    }
    if (lower.includes('api') || lower.includes('database') || lower.includes('server') || lower.includes('python')) {
      return 'Backend Agent'
    }
    if (lower.includes('test') || lower.includes('jest') || lower.includes('pytest')) {
      return 'Testing Agent'
    }
    if (lower.includes('docker') || lower.includes('k8s') || lower.includes('deploy') || lower.includes('ci/cd')) {
      return 'DevOps Agent'
    }
    return 'System'
  }

  const generateResponse = (message: string): string => {
    const agent = detectAgent(message)
    
    if (agent === 'Frontend Agent') {
      return `I'll help you with that frontend task!\n\nHere's what I can do:\n1. Create React components\n2. Set up TypeScript types\n3. Design with Tailwind CSS\n4. Implement state management\n\nLet me know the specific requirements and I'll generate the code for you.`
    }
    if (agent === 'Backend Agent') {
      return `I'll help you with that backend task!\n\nHere's what I can do:\n1. Create API endpoints\n2. Design database schemas\n3. Implement business logic\n4. Set up authentication\n\nPlease provide more details about your requirements.`
    }
    if (agent === 'Testing Agent') {
      return `I'll help you with testing!\n\nHere's what I can do:\n1. Write unit tests\n2. Create integration tests\n3. Set up E2E testing\n4. Analyze code coverage\n\nWhat would you like me to test?`
    }
    if (agent === 'DevOps Agent') {
      return `I'll help you with DevOps!\n\nHere's what I can do:\n1. Create Dockerfiles\n2. Set up CI/CD pipelines\n3. Configure Kubernetes\n4. Set up monitoring\n\nWhat infrastructure do you need?`
    }
    return `I understand your request. Let me route this to the appropriate agent for you.`
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>💬 Chat with Agents</CardTitle>
            <div className="flex space-x-2">
              <Badge variant="outline">Frontend</Badge>
              <Badge variant="outline">Backend</Badge>
              <Badge variant="outline">Testing</Badge>
              <Badge variant="outline">DevOps</Badge>
            </div>
          </div>
        </CardHeader>
        
        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-white border border-slate-200 text-gray-900 shadow-sm'
                }`}
              >
                {message.agent && (
                  <div className={`text-xs font-medium mb-2 flex items-center space-x-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
                      {message.agent === 'Frontend Agent' ? '🎨' :
                       message.agent === 'Backend Agent' ? '⚙️' :
                       message.agent === 'Testing Agent' ? '🧪' :
                       message.agent === 'DevOps Agent' ? '🚀' : '🤖'}
                    </span>
                    <span>{message.agent}</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t p-4 bg-slate-50">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message... (e.g., 'Create a React login component')"
              className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isTyping} size="lg">
              Send →
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Create a React login component')}
              className="text-xs"
            >
              💡 React component
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Design a user API endpoint')}
              className="text-xs"
            >
              💡 Design API
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Write unit tests for auth module')}
              className="text-xs"
            >
              💡 Write tests
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('Create a Dockerfile for deployment')}
              className="text-xs"
            >
              💡 Create Dockerfile
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
