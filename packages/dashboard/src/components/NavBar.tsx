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
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090b10]/88 backdrop-blur-2xl">
        <div className="mx-auto max-w-[1540px] px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#ff5c1f]/45 bg-[#ff5c1f]/12 shadow-[inset_0_0_18px_rgba(255,92,31,0.22)]">
                <span className="text-sm font-black tracking-tight text-[#ff6a2b]">DT</span>
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-[0.24em] text-[#f5f7fb] sm:text-base">
                  DEV-Agent-Teams
                </h1>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7f8ca0]">Team Coordination OS</p>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <div
                className={`hidden items-center space-x-2 rounded-md border px-3 py-1.5 md:flex ${
                  systemOnline
                    ? 'border-[#33ff99]/30 bg-[#33ff99]/10'
                    : 'border-[#ff5252]/30 bg-[#ff5252]/10'
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
                    systemOnline ? 'text-[#63f7ae]' : 'text-[#ff7f7f]'
                  }`}
                >
                  {systemOnline
                    ? `${stats.onlineCount} Agents Online`
                    : 'No Agents'}
                </span>
              </div>
              <button className="rounded-md border border-white/10 p-2 text-[#8d9bad] transition-colors hover:border-[#5be5ff]/40 hover:bg-[#5be5ff]/10 hover:text-[#64e7ff]">
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
                <div className="h-8 w-8 animate-pulse rounded-md bg-white/10" />
              ) : user ? (
                <div className="flex items-center space-x-3">
                  <div className="relative group">
                    <button className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#5be5ff]/30 bg-[#5be5ff]/12 text-sm font-bold text-[#64e7ff] transition-all hover:ring-2 hover:ring-[#5be5ff]/30">
                      {user.name?.[0] || user.username[0].toUpperCase()}
                    </button>
                    {/* Dropdown */}
                    <div className="invisible absolute right-0 z-50 mt-2 w-48 rounded-md border border-white/10 bg-[#11141b] py-1 opacity-0 shadow-2xl shadow-black/40 transition-all group-hover:visible group-hover:opacity-100">
                      <div className="border-b border-white/10 px-4 py-2">
                        <p className="text-sm font-medium text-[#f4f8ff]">
                          {user.name || user.username}
                        </p>
                        {user.email && (
                          <p className="truncate text-xs text-[#8d9bad]">{user.email}</p>
                        )}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-[#c7d2e1] transition-colors hover:bg-white/5"
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
                    className="px-3 py-1.5 text-sm font-medium text-[#64e7ff] transition-colors hover:text-white"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-[#ff5c1f] px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-[#ff713d]"
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
      <nav className="border-b border-white/10 bg-[#0c0f15]/80 backdrop-blur-xl">
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
                      ? 'border-[#ff5c1f] bg-[#ff5c1f]/10 text-[#ff8a56]'
                      : 'border-transparent text-[#8d9bad] hover:bg-white/5 hover:text-[#f4f8ff]'
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
