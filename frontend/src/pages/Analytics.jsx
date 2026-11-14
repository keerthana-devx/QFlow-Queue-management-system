import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { getAnalytics } from '../services/api';
import PageShell from '../components/PageShell';

const PIE_COLORS = ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#b7e4c7'];

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAnalytics().then(r => setData(r.data)).catch(() => {});
  }, []);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1b4332] mb-6">Analytics</h1>

        {!data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#2d6a4f]" size={32} />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                { label: 'Total Today',    value: data.total },
                { label: 'Waiting',        value: data.waiting },
                { label: 'In Progress',    value: data.serving },
                { label: 'Completed',      value: data.completed },
                { label: 'Cancelled',      value: data.cancelled },
                { label: 'Avg Wait',       value: `${data.avgWaitTime}m` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                  <p className="text-2xl font-bold text-[#1b4332]">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Weekly trend */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-4">Appointments — Last 7 Days</p>
                {data.weekly.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Department pie */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-4">By Department — Today</p>
                {data.byDepartment.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">No appointments today</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.byDepartment}
                        dataKey="count"
                        nameKey="dept"
                        cx="50%" cy="50%"
                        outerRadius={75}
                        label={({ dept, percent }) => `${dept.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.byDepartment.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [v, p.payload.dept]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Timing metrics */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Waiting Time</p>
                <p className="text-4xl font-bold text-[#1b4332]">
                  {data.avgWaitTime} <span className="text-lg font-normal text-gray-400">min</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">From registration to being called</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Service Duration</p>
                <p className="text-4xl font-bold text-[#1b4332]">
                  {data.avgServiceTime} <span className="text-lg font-normal text-gray-400">min</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">From service start to completion</p>
              </div>
            </div>

            {/* Doctor workload table */}
            {data.doctorWorkload.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-4">Doctor Workload</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="text-left pb-2 font-medium">Doctor</th>
                        <th className="text-left pb-2 font-medium">Department</th>
                        <th className="text-left pb-2 font-medium">Status</th>
                        <th className="text-right pb-2 font-medium">Active Now</th>
                        <th className="text-right pb-2 font-medium">Completed Today</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.doctorWorkload.map((d, i) => (
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
