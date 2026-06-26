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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/82 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-[#111820] shadow-[7px_7px_0_rgba(255,92,31,0.18)]">
                <span className="text-sm font-black tracking-tight text-white">DT</span>
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-[0.24em] text-[#111820] sm:text-base">
                  DEV-Agent-Teams
                </h1>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Team Coordination OS</p>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <div
                className={`hidden items-center space-x-2 rounded-md border px-3 py-1.5 md:flex ${
                  systemOnline
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
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
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    systemOnline ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {systemOnline
                    ? `${stats.onlineCount} Agents Online`
                    : 'No Agents'}
                </span>
              </div>
              <button className="rounded-md border border-slate-200 bg-white/70 p-2 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-[#111820]">
                <svg
                  className="h-5 w-5"
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
                <div className="h-8 w-8 animate-pulse rounded-md bg-slate-200" />
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <div className="relative group">
                    <button className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-bold text-[#111820] transition-all hover:ring-2 hover:ring-[#007f96]/20">
                      {user.name?.[0] || user.username[0].toUpperCase()}
                    </button>
                    {/* Dropdown */}
                    <div className="invisible absolute right-0 z-50 mt-2 w-48 rounded-md border border-slate-200 bg-white py-1 opacity-0 shadow-2xl shadow-slate-300/40 transition-all group-hover:visible group-hover:opacity-100">
                      <div className="border-b border-slate-200 px-4 py-2">
                        <p className="text-sm font-medium text-[#111820]">
                          {user.name || user.username}
                        </p>
                        {user.email && (
                          <p className="truncate text-xs text-slate-500">{user.email}</p>
                        )}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                      >
                        登出
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="px-3 py-1.5 text-sm font-medium text-[#007f96] transition-colors hover:text-[#111820]"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-[#111820] px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-black"
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
      <nav className="border-b border-slate-200 bg-white/58 backdrop-blur-xl">
        <div className="mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                    isActive
                      ? 'border-[#ff5c1f] bg-[#ff5c1f]/8 text-[#111820]'
                      : 'border-transparent text-slate-500 hover:bg-white/80 hover:text-[#111820]'
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
