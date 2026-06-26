import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DEV-Agent-Teams Dashboard',
  description: 'Agent team coordination console',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ToastProvider>
            <div className="dev-shell flex min-h-screen flex-col">
              <NavBar />
              <main className="mx-auto w-full max-w-[1540px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </main>
              <footer className="mt-auto border-t border-white/10 bg-[#090b10]/80 backdrop-blur-xl">
                <div className="mx-auto max-w-[1540px] px-4 py-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.24em] text-[#78869a] sm:flex-row sm:items-center sm:justify-between">
                    <p>DEV-Agent-Teams v0.1.0</p>
                    <p>Gateway / Hermes / Coordination Layer</p>
                  </div>
                </div>
              </footer>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
