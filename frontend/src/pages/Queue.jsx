import { useEffect, useState } from 'react';
import { UserPlus, ChevronRight, CheckCheck, Trash2, Loader } from 'lucide-react';
import { getQueue, issueToken, callNext, complete, resetQueue } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const statusStyle = {
  waiting:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  serving:   'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
};

export default function Queue() {
  const [tokens, setTokens] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try { const r = await getQueue(); setTokens(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await issueToken({ customerName: name || 'Walk-in' }); setName(''); await refresh(); }
    finally { setBusy(false); }
  };

  const handleCallNext = async () => {
    setBusy(true);
    try { await callNext(); await refresh(); }
    catch (err) { alert(err.response?.data?.message || 'No waiting tokens'); }
    finally { setBusy(false); }
  };

  const handleComplete = async (id) => {
    setBusy(true);
    try { await complete(id); await refresh(); }
    finally { setBusy(false); }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset today's entire queue?")) return;
    setBusy(true);
    try { await resetQueue(); await refresh(); }
    finally { setBusy(false); }
  };

  const serving = tokens.find(t => t.status === 'serving');
  const waiting = tokens.filter(t => t.status === 'waiting');
  const done    = tokens.filter(t => t.status === 'completed');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 pb-20 md:pb-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#1b4332]">Queue</h1>
            <button onClick={handleReset} disabled={busy} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-40">
              <Trash2 size={14} /> Reset
            </button>
          </div>

          {/* Issue token form */}
          <form onSubmit={handleIssue} className="flex gap-2 mb-6">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Customer name (optional)"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            />
            <button type="submit" disabled={busy} className="flex items-center gap-2 px-4 py-2.5 bg-[#2d6a4f] text-white text-sm font-semibold rounded-lg hover:bg-[#1b4332] disabled:opacity-60 transition-colors">
              <UserPlus size={16} /> Issue Token
            </button>
          </form>

          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={handleCallNext} disabled={busy || waiting.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <ChevronRight size={18} /> Call Next
            </button>
            {serving && (
              <button onClick={() => handleComplete(serving._id)} disabled={busy}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
                <CheckCheck size={18} /> Complete Service
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader className="animate-spin text-[#2d6a4f]" /></div>
          ) : (
            <>
              {/* Currently serving */}
              {serving && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Now Serving</p>
                  <p className="text-3xl font-bold text-blue-700">#{serving.number}</p>
                  <p className="text-sm text-blue-600">{serving.customerName}</p>
                </div>
              )}

              {/* Waiting list */}
              {waiting.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">
                    Waiting ({waiting.length})
                  </p>
                  {waiting.map((t, i) => (
                    <div key={t._id} className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 text-sm font-bold flex items-center justify-center">
                          {t.number}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.customerName}</p>
                          <p className="text-xs text-gray-400">Position {i + 1}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed */}
              {done.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">
                    Completed ({done.length})
                  </p>
                  {done.slice().reverse().map(t => (
                    <div key={t._id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 opacity-60">
                      <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center">
                        {t.number}
                      </span>
                      <p className="text-sm text-gray-600">{t.customerName}</p>
                    </div>
                  ))}
                </div>
              )}

              {tokens.length === 0 && (
                <p className="text-center text-gray-400 py-12">No tokens issued today. Issue the first one above.</p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
