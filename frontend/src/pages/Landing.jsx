import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';

const features = [
  'Issue digital tokens instantly',
  'Real-time queue visibility',
  'Call Next & Complete with one click',
  'Analytics and wait-time estimates',
  'Each manager sees only their queue',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#d8f3dc] via-white to-[#b7e4c7] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <Logo variant="full" size="md" />
        <div className="flex gap-3">
          <Link to="/login"    className="px-4 py-2 text-sm font-medium text-[#1b4332] hover:underline">Login</Link>
          <Link to="/register" className="px-4 py-2 text-sm font-semibold bg-[#2d6a4f] text-white rounded-lg hover:bg-[#1b4332] transition-colors">Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="mb-6">
          <Logo variant="icon" size="lg" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1b4332] mb-4 max-w-2xl leading-tight">
          Replace the physical line with a smart digital queue
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-xl">
          QFlow lets managers issue tokens, call customers, and track service time — all from one clean dashboard.
        </p>
        <div className="flex gap-4 flex-wrap justify-center mb-12">
          <Link to="/register" className="px-6 py-3 bg-[#2d6a4f] text-white font-semibold rounded-xl hover:bg-[#1b4332] transition-colors shadow-md">
            Start for Free
          </Link>
          <Link to="/login" className="px-6 py-3 border-2 border-[#2d6a4f] text-[#2d6a4f] font-semibold rounded-xl hover:bg-[#d8f3dc] transition-colors">
            Login
          </Link>
        </div>

        {/* Feature list */}
        <ul className="flex flex-col gap-2 text-left">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-gray-700 text-sm">
              <CheckCircle size={16} className="text-[#2d6a4f] flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} QFlow — Smart Queue Management
      </footer>
    </div>
  );
}
