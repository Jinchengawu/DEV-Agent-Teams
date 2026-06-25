'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/constants';
import { useAgentHealth } from '@/hooks/useAgentHealth';
import { useAuth } from '@/lib/auth-context';

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { stats } = useAgentHealth();
  const systemOnline = stats.onlineCount > 0;
  const { user, loading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">🧠</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  DEV-Agent-Teams
                </h1>
                <p className="text-xs text-gray-500">API Gateway + Hermes Agents</p>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <div
                className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full ${
                  systemOnline ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    systemOnline
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                ></div>
                <span
                  className={`text-sm font-medium ${
                    systemOnline ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {systemOnline
                    ? `${stats.onlineCount} Agents Online`
                    : 'No Agents'}
                </span>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>

              {/* User section */}
              {loading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <div className="relative group">
                    <button className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                      {user.name?.[0] || user.username[0].toUpperCase()}
                    </button>
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user.name || user.username}
                        </p>
                        {user.email && (
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        )}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        🚪 登出
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-1.5 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/50 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
