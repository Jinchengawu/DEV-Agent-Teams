'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  {
    title: 'Dashboard',
    icon: '📊',
    href: '/',
  },
  {
    title: 'Agents',
    icon: '🤖',
    href: '/agents',
    children: [
      { title: 'All Agents', href: '/agents' },
      { title: 'Frontend', href: '/agents/frontend' },
      { title: 'Backend', href: '/agents/backend' },
      { title: 'Testing', href: '/agents/testing' },
      { title: 'DevOps', href: '/agents/devops' },
    ],
  },
  {
    title: 'Skills',
    icon: '📚',
    href: '/skills',
  },
  {
    title: 'Chat',
    icon: '💬',
    href: '/chat',
  },
  {
    title: 'Monitoring',
    icon: '📈',
    href: '/monitoring',
  },
  {
    title: 'Settings',
    icon: '⚙️',
    href: '/settings',
  },
]

export function Sidebar() {
  const [expanded, setExpanded] = useState(true)
  const [openMenus, setOpenMenus] = useState<string[]>(['Agents'])
  const pathname = usePathname()

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  return (
    <aside className={`bg-gray-900 text-white transition-all duration-300 ${expanded ? 'w-64' : 'w-20'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {expanded && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🧠</span>
            </div>
            <span className="font-bold">DEV-Agent</span>
          </div>
        )}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          {expanded ? '◀' : '▶'}
        </button>
      </div>

      {/* Menu */}
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => (
          <div key={item.title}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleMenu(item.title)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    openMenus.includes(item.title) ? 'bg-gray-800' : 'hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {expanded && (
                    <>
                      <span className="flex-1 text-left">{item.title}</span>
                      <span className="text-xs">{openMenus.includes(item.title) ? '▼' : '▶'}</span>
                    </>
                  )}
                </button>
                {expanded && openMenus.includes(item.title) && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                          pathname === child.href
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {expanded && <span>{item.title}</span>}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* User Info */}
      {expanded && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              Z
            </div>
            <div>
              <p className="text-sm font-medium">Zhuizhui</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
