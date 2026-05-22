'use client'

import { useState, useRef, useEffect } from 'react'

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
      content: 'Hello! I\'m DEV-Agent-Teams. I can help you with:\n\n- Frontend development (React, Vue, TypeScript)\n- Backend development (Python, Node.js, Go)\n- Testing (pytest, Jest, Playwright)\n- DevOps (Docker, Kubernetes, CI/CD)\n\nWhat would you like to work on?',
      agent: 'system',
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

    // Simulate agent response
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border text-gray-900'
              }`}
            >
              {message.agent && (
                <div className={`text-xs font-medium mb-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.agent}
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
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message... (e.g., 'Create a React login component')"
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div className="mt-2 flex space-x-2">
          <button
            onClick={() => setInput('Create a React login component')}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            💡 Create React component
          </button>
          <button
            onClick={() => setInput('Design a user API endpoint')}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            💡 Design API
          </button>
          <button
            onClick={() => setInput('Write unit tests for auth module')}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            💡 Write tests
          </button>
          <button
            onClick={() => setInput('Create a Dockerfile for deployment')}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            💡 Create Dockerfile
          </button>
        </div>
      </div>
    </div>
  )
}
