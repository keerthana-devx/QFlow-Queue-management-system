import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, CheckCircle, XCircle, Stethoscope, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getAnalytics } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PageShell from '../components/PageShell';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: color + '18' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user }          = useAuth();
  const { socket }        = useSocket() || {};
  const [stats, setStats] = useState(null);

  const load = useCallback(() => {
    getAnalytics().then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh stats on any real-time appointment event
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('appointment:new',       refresh);
    socket.on('appointment:called',    refresh);
    socket.on('appointment:serving',   refresh);
    socket.on('appointment:completed', refresh);
    socket.on('appointment:cancelled', refresh);
    return () => {
      socket.off('appointment:new',       refresh);
      socket.off('appointment:called',    refresh);
      socket.off('appointment:serving',   refresh);
      socket.off('appointment:completed', refresh);
      socket.off('appointment:cancelled', refresh);
    };
  }, [socket, load]);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1b4332]">
              Good day, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{user?.organisation || "Today's overview"}</p>
          </div>
          <Link
            to="/appointments"
            className="px-4 py-2 bg-[#2d6a4f] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4332] transition-colors"
          >
            Manage Queue →
          </Link>
        </div>

        {!stats ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#2d6a4f]" size={32} />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <StatCard icon={Users}       label="Total Today"  value={stats.total}     color="#2d6a4f" />
              <StatCard icon={Clock}       label="Waiting"      value={stats.waiting}   color="#f59e0b" />
              <StatCard icon={TrendingUp}  label="In Progress"  value={stats.serving}   color="#3b82f6" />
              <StatCard icon={CheckCircle} label="Completed"    value={stats.completed} color="#10b981" />
              <StatCard icon={XCircle}     label="Cancelled"    value={stats.cancelled} color="#ef4444" />
            </div>

            {/* Timing cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Wait Time</p>
                <p className="text-3xl font-bold text-[#1b4332]">
                  {stats.avgWaitTime} <span className="text-base font-normal text-gray-400">min</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Service Time</p>
                <p className="text-3xl font-bold text-[#1b4332]">
                  {stats.avgServiceTime} <span className="text-base font-normal text-gray-400">min</span>
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Est. Wait (Next)</p>
                <p className="text-3xl font-bold text-[#1b4332]">
                  {stats.estimatedWait} <span className="text-base font-normal text-gray-400">min</span>
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Weekly trend */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-4">Appointments — Last 7 Days</p>
                {stats.weekly.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Department breakdown */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-4">By Department — Today</p>
                {stats.byDepartment.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No appointments today</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {stats.byDepartment.map(({ dept, count }) => (
                      <div key={dept} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-36 truncate">{dept}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-[#2d6a4f] h-2 rounded-full"
                            style={{ width: `${Math.min(100, (count / stats.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Doctor workload */}
            {stats.doctorWorkload.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  <Stethoscope size={14} className="inline mr-1" />
                  Doctor Workload — Today
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="text-left pb-2 font-medium">Doctor</th>
                        <th className="text-left pb-2 font-medium">Department</th>
                        <th className="text-left pb-2 font-medium">Status</th>
                        <th className="text-right pb-2 font-medium">Active</th>
                        <th className="text-right pb-2 font-medium">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.doctorWorkload.map((d, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 font-medium text-gray-800">{d.name}</td>
                          <td className="py-2.5 text-gray-500">{d.department}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              d.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${d.available ? 'bg-green-500' : 'bg-red-400'}`} />
                              {d.available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-semibold text-gray-700">{d.activeCount}</td>
                          <td className="py-2.5 text-right text-gray-500">{d.completedToday}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
