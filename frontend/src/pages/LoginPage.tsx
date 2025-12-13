import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      navigate('/');
    } catch {
      setError('登入失敗，請檢查帳號密碼');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center text-amber-400 mb-8">
          光譜紀元
        </h1>
        <h2 className="text-xl text-center text-gray-300 mb-6">登入</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">
              電子郵件
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded
                         text-white placeholder-gray-500
                         focus:outline-none focus:border-amber-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded
                         text-white placeholder-gray-500
                         focus:outline-none focus:border-amber-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500
                       disabled:bg-gray-600 disabled:cursor-not-allowed
                       text-white font-semibold rounded transition-colors"
          >
            {isLoading ? '登入中...' : '登入'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          還沒有帳號？{' '}
          <Link to="/register" className="text-amber-400 hover:underline">
            註冊
          </Link>
        </p>
      </div>
    </div>
  );
}
