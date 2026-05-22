import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DEV-Agent-Teams Dashboard',
  description: 'Developer Multi-Agent System Management Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">🧠</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">DEV-Agent-Teams</h1>
                    <p className="text-xs text-gray-500">OpenClaw × Hermes</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">System Online</span>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    Z
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation */}
          <nav className="bg-white/50 backdrop-blur-sm border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex space-x-1">
                <a href="/" className="px-4 py-3 text-sm font-medium text-blue-600 bg-blue-50 rounded-t-lg border-b-2 border-blue-500">
                  📊 Dashboard
                </a>
                <a href="/agents" className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors">
                  🤖 Agents
                </a>
                <a href="/skills" className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors">
                  📚 Skills
                </a>
                <a href="/chat" className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors">
                  💬 Chat
                </a>
                <a href="/settings" className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors">
                  ⚙️ Settings
                </a>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white/50 border-t border-slate-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <p>DEV-Agent-Teams v0.1.0</p>
                <p>Powered by OpenClaw + Hermes</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
