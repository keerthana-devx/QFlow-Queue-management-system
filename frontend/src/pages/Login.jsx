import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Login() {
  const { loginUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#d8f3dc] via-white to-[#b7e4c7] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Logo variant="full" size="md" />
        </div>
        <h2 className="text-xl font-bold text-[#1b4332] mb-6 text-center">Welcome back</h2>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            name="email" type="email" placeholder="Email" required
            value={form.email} onChange={handle}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          />
          <input
            name="password" type="password" placeholder="Password" required
            value={form.password} onChange={handle}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
          />
          <button
            type="submit" disabled={loading}
            className="bg-[#2d6a4f] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1b4332] transition-colors disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{' '}
          <Link to="/register" className="text-[#2d6a4f] font-medium hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
