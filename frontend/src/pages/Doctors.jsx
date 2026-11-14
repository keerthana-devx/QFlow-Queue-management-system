import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Pencil, Trash2, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { getDoctors, addDoctor, updateDoctor, deleteDoctor } from '../services/api';
import { useSocket } from '../context/SocketContext';
import PageShell from '../components/PageShell';

const DEPARTMENTS = [
  'General Medicine','Cardiology','Dental','Dermatology',
  'Orthopaedics','Pharmacy','Paediatrics','Gynaecology','Ophthalmology','ENT'
];

const EMPTY_FORM = { name: '', department: '', speciality: '' };

export default function Doctors() {
  const { socket }              = useSocket() || {};
  const [doctors, setDoctors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    try { const r = await getDoctors(); setDoctors(r.data); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (doc) => setDoctors(prev => {
      const idx = prev.findIndex(d => d._id === doc._id);
      if (idx === -1) return [...prev, doc];
      const next = [...prev]; next[idx] = doc; return next;
    });
    const onDelete = ({ id }) => setDoctors(prev => prev.filter(d => d._id !== id));
    socket.on('doctor:updated', onUpdate);
    socket.on('doctor:deleted', onDelete);
    return () => { socket.off('doctor:updated', onUpdate); socket.off('doctor:deleted', onDelete); };
  }, [socket]);

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(''); setShowForm(true); };
  const openEdit = (doc) => { setEditTarget(doc); setForm({ name: doc.name, department: doc.department, speciality: doc.speciality }); setError(''); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.department) { setError('Name and department are required'); return; }
    setBusy(true);
    try {
      if (editTarget) {
        await updateDoctor(editTarget._id, form);
      } else {
        await addDoctor(form);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setBusy(false); }
  };

  const toggleAvailability = async (doc) => {
    setBusy(true);
    try { await updateDoctor(doc._id, { available: !doc.available }); }
    catch { /* silent */ }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this doctor?')) return;
    setBusy(true);
    try { await deleteDoctor(id); }
    catch { /* silent */ }
    finally { setBusy(false); }
  };

  const byDept = doctors.reduce((acc, d) => {
    (acc[d.department] = acc[d.department] || []).push(d);
    return acc;
  }, {});

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1b4332]">Doctors & Staff</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {doctors.filter(d => d.available).length} available · {doctors.length} total
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#2d6a4f] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4332] transition-colors"
          >
            <UserPlus size={16} /> Add Doctor
          </button>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {editTarget ? 'Edit Doctor' : 'Add New Doctor / Staff'}
            </h2>
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. Ananya Sharma"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Department *</label>
                <select
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Speciality</label>
                <input
                  value={form.speciality}
                  onChange={e => setForm(f => ({ ...f, speciality: e.target.value }))}
                  placeholder="e.g. Cardiologist"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>
              <div className="md:col-span-3 flex gap-3 pt-1">
                <button
                  type="submit" disabled={busy}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2d6a4f] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4332] disabled:opacity-60 transition-colors"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {editTarget ? 'Save Changes' : 'Add Doctor'}
                </button>
                <button
                  type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#2d6a4f]" size={32} />
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20">
            <UserPlus size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No doctors added yet</p>
            <p className="text-gray-300 text-sm mt-1">Add your first doctor to enable auto-assignment</p>
          </div>
        ) : (
          Object.entries(byDept).map(([dept, docs]) => (
            <div key={dept} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{dept}</p>
              </div>
              {docs.map(doc => (
                <div key={doc._id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="w-10 h-10 rounded-full bg-[#d8f3dc] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1b4332] font-bold text-sm">
                      {doc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                    <p className="text-xs text-gray-400">{doc.speciality || doc.department}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="hidden md:block">{doc.activeCount} active</span>
                  </div>
                  <button
                    onClick={() => toggleAvailability(doc)}
                    disabled={busy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      doc.available
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {doc.available
                      ? <><CheckCircle size={12} /> Available</>
                      : <><XCircle size={12} /> Unavailable</>}
                  </button>
                  <button
                    onClick={() => openEdit(doc)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    disabled={busy}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </PageShell>
  );
}
