import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        if (!name.trim()) throw new Error('Name is required');
        if (!username.trim()) throw new Error('Username is required');

        const cleanUsername = username.trim().startsWith('@')
          ? username.trim()
          : `@${username.trim()}`;

        data = await api.register({
          name: name.trim(),
          username: cleanUsername,
          email: email.trim(),
          password,
        });

        const userWithUsername = {
          ...data.user,
          username: cleanUsername,
        };

        setAuth(userWithUsername, data.token);
        setSuccess('Account created successfully!');
      } else {
        data = await api.login({ email, password });
        const userWithUsername = {
          ...data.user,
          username: data.user.username || (data.user.email ? `@${data.user.email.split('@')[0]}` : ''),
        };
        setAuth(userWithUsername, data.token);
        setSuccess('Logged in successfully!');
      }

      setTimeout(() => {
        navigate('/');
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100 dark:bg-black text-black dark:text-white">
      <div className="w-full max-w-sm rounded-3xl p-8 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md mb-3 border border-neutral-300 dark:border-neutral-800 bg-black">
            <img
              src="/logo.png"
              alt="CiesGPT Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {isRegister ? 'Create an Account' : 'Welcome to CiesGPT'}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 text-center">
            Next-generation webchat powered by CiesGPT neural intelligence
          </p>
        </div>

        {/* Error Card - Red */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 self-start mt-0.5" />
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <span className="font-medium leading-tight">
                {error.replace(/\.?\s*Please (create an account|log in instead)\.?/i, '').trim()}
              </span>
              {(error.toLowerCase().includes('not registered') ||
                error.toLowerCase().includes('belum didaftarkan') ||
                error.toLowerCase().includes('belum register')) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-left font-semibold text-xs text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 underline transition-colors"
                >
                  Create an account with this email →
                </button>
              )}
              {(error.toLowerCase().includes('already in use') ||
                error.toLowerCase().includes('already registered')) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-left font-semibold text-xs text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 underline transition-colors"
                >
                  Log in with this email →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success Card - Green */}
        {success && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="font-medium leading-relaxed">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="CSDevelopment"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@csdevelopment"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="csdevelopment@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-black dark:focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-black dark:focus:border-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:opacity-85 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Sign Up' : 'Continue'}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-neutral-500">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
            }}
            className="text-black dark:text-white font-semibold underline underline-offset-4"
          >
            {isRegister ? 'Log in' : 'Sign up'}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
          >
            ← Return to Chat
          </button>
        </div>
      </div>
    </div>
  );
};
