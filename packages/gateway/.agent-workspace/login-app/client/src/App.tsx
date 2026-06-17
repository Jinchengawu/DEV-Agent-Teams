import React, { useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { isAuthenticated, user, loading, error, login, logout, verifyToken, clearError } =
    useAuth();

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleLogin = async (email: string, password: string) => {
    await login({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">SecureApp</span>
        </div>
      </div>

      {/* Main Content */}
      {isAuthenticated && user ? (
        <Dashboard user={user} onLogout={logout} />
      ) : (
        <LoginForm
          onSubmit={handleLogin}
          loading={loading}
          error={error}
          onClearError={clearError}
        />
      )}

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400">
        © 2024 SecureApp. All rights reserved.
      </p>
    </div>
  );
};

export default App;
