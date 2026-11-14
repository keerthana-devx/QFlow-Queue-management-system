import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { getHistory } from '../services/api';
import PageShell from '../components/PageShell';
import StatusBadge from '../components/StatusBadge';

const DEPARTMENTS = [
  '','General Medicine','Cardiology','Dental','Dermatology',
  'Orthopaedics','Pharmacy','Paediatrics','Gynaecology','Ophthalmology','ENT'
];
const STATUSES = ['','waiting','assigned','called','serving','completed','cancelled'];

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}
function duration(a, b) {
  if (!a || !b) return '—';
  const m = Math.round((new Date(b) - new Date(a)) / 60000);
  return `${m} min`;
}

export default function History() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', department: '', status: '', date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search)     params.search     = filters.search;
      if (filters.department) params.department = filters.department;
      if (filters.status)     params.status     = filters.status;
      if (filters.date)       params.date       = filters.date;
      const r = await getHistory(params);
      setRecords(r.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1b4332]">Appointment History</h1>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} records found</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative col-span-2 md:col-span-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Name or token…"
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
              />
            </div>
            <select
              value={filters.department}
              onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white"
            >
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d || 'All Departments'}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white capitalize"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#2d6a4f]" size={32} />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-20">
            <Filter size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No records found</p>
            <p className="text-gray-300 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium">Token</th>
                    <th className="text-left px-4 py-3 font-medium">Patient</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Department</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Doctor</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Registered</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Wait</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#1b4332]">{r.tokenCode}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.patientName}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{r.department}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-[140px] truncate">{r.purpose}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                        {r.doctorId ? `Dr. ${r.doctorId.name}` : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{fmtDate(r.issuedAt)}</td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{duration(r.issuedAt, r.calledAt)}</td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{duration(r.servingAt, r.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
