import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('密碼不一致');
      return;
    }

    if (password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }

    try {
      await register({ email, password });
      navigate('/');
    } catch {
      setError('註冊失敗，該信箱可能已被使用');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md p-6 sm:p-8 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center text-amber-400 mb-8">
          光譜紀元
        </h1>
        <h2 className="text-xl text-center text-gray-300 mb-6">建立帳號</h2>

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
              placeholder="至少 6 個字元"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">
              確認密碼
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded
                         text-white placeholder-gray-500
                         focus:outline-none focus:border-amber-500"
              placeholder="再次輸入密碼"
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
            {isLoading ? '註冊中...' : '註冊'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          已有帳號？{' '}
          <Link to="/login" className="text-amber-400 hover:underline">
            登入
          </Link>
        </p>
      </div>
    </div>
  );
}
