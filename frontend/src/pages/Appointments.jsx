import { useEffect, useState, useCallback } from 'react';
import {
  UserPlus, ChevronRight, CheckCheck, XCircle,
  RefreshCw, Loader2, AlertCircle, UserCheck
} from 'lucide-react';
import {
  getAppointments, registerPatient, callNext,
  serveAppointment, completeAppt, cancelAppt,
  reassignAppt, getDoctors
} from '../services/api';
import { useSocket } from '../context/SocketContext';
import PageShell from '../components/PageShell';
import StatusBadge from '../components/StatusBadge';

const DEPARTMENTS = [
  'General Medicine','Cardiology','Dental','Dermatology',
  'Orthopaedics','Pharmacy','Paediatrics','Gynaecology','Ophthalmology','ENT'
];
const PURPOSES = [
  'General Consultation','Dental Check-up','Fever','Follow-up Appointment',
  'Blood Test','Medicine Collection','Eye Examination','Vaccination','X-Ray','Emergency'
];

const STATUS_COLOR = {
  waiting:   'border-l-amber-400',
  assigned:  'border-l-blue-400',
  called:    'border-l-purple-400',
  serving:   'border-l-green-500',
  completed: 'border-l-gray-300',
  cancelled: 'border-l-red-300',
};

export default function Appointments() {
  const { socket }              = useSocket() || {};
  const [appts, setAppts]       = useState([]);
  const [doctors, setDoctors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [form, setForm]         = useState({
    patientName: '', phone: '', department: '', purpose: '',
    preferredDoctor: '', notes: ''
  });
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, d] = await Promise.all([getAppointments(), getDoctors()]);
      setAppts(a.data);
      setDoctors(d.data);
    } catch { /* handled silently */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time socket updates — patch individual records instead of full reload
  useEffect(() => {
    if (!socket) return;
    const patch = (updated) => {
      setAppts(prev => {
        const idx = prev.findIndex(a => a._id === updated._id);
        if (idx === -1) return [updated, ...prev];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    };
    const add = (appt) => setAppts(prev => [appt, ...prev]);

    socket.on('appointment:new',       add);
    socket.on('appointment:called',    patch);
    socket.on('appointment:serving',   patch);
    socket.on('appointment:completed', patch);
    socket.on('appointment:cancelled', patch);
    socket.on('appointment:reassigned',patch);
    return () => {
      socket.off('appointment:new',       add);
      socket.off('appointment:called',    patch);
      socket.off('appointment:serving',   patch);
      socket.off('appointment:completed', patch);
      socket.off('appointment:cancelled', patch);
      socket.off('appointment:reassigned',patch);
    };
  }, [socket]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.patientName.trim() || !form.department || !form.purpose) {
      setFormError('Name, department and purpose are required.');
      return;
    }
    setBusy(true);
    try {
      await registerPatient(form);
      setForm({ patientName: '', phone: '', department: '', purpose: '', preferredDoctor: '', notes: '' });
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Registration failed');
    } finally { setBusy(false); }
  };

  const action = async (fn, ...args) => {
    setBusy(true);
    try { await fn(...args); }
    catch (err) { alert(err.response?.data?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  const handleReassign = async (apptId, doctorId) => {
    setBusy(true);
    try { await reassignAppt(apptId, doctorId); setReassignTarget(null); }
    catch (err) { alert(err.response?.data?.message || 'Reassign failed'); }
    finally { setBusy(false); }
  };

  const active  = appts.filter(a => ['waiting','assigned','called','serving'].includes(a.status));
  const done    = appts.filter(a => ['completed','cancelled'].includes(a.status));
  const waiting = appts.filter(a => ['waiting','assigned'].includes(a.status));

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1b4332]">Appointments</h1>
            <p className="text-sm text-gray-500 mt-0.5">{waiting.length} waiting · {active.length} active today</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-[#2d6a4f] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4332] transition-colors"
            >
              <UserPlus size={16} />
              Register Patient
            </button>
          </div>
        </div>

        {/* Registration form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">New Patient Registration</h2>
            {formError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">
                <AlertCircle size={14} /> {formError}
              </div>
            )}
            <form onSubmit={handleRegister} className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Full Name *</label>
                <input
                  value={form.patientName}
                  onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                  placeholder="Patient full name"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
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
                <label className="text-xs font-medium text-gray-500">Purpose of Visit *</label>
                <select
                  value={form.purpose}
                  onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white"
                >
                  <option value="">Select purpose</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Preferred Doctor (optional)</label>
                <select
                  value={form.preferredDoctor}
                  onChange={e => setForm(f => ({ ...f, preferredDoctor: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] bg-white"
                >
                  <option value="">No preference</option>
                  {doctors
                    .filter(d => !form.department || d.department === form.department)
                    .map(d => (
                      <option key={d._id} value={d.name} disabled={!d.available}>
                        {d.name}{!d.available ? ' (unavailable)' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Notes (optional)</label>
                <input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes"
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]"
                />
              </div>
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button
                  type="submit" disabled={busy}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#2d6a4f] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4332] disabled:opacity-60 transition-colors"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Register & Issue Token
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

        {/* Call Next button */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => action(callNext)}
            disabled={busy || waiting.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={18} /> Call Next Patient
          </button>
          <span className="flex items-center text-sm text-gray-400">
            {waiting.length} patient{waiting.length !== 1 ? 's' : ''} waiting
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#2d6a4f]" size={32} />
          </div>
        ) : (
          <>
            {/* Active appointments */}
            {active.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active ({active.length})</p>
                </div>
                {active.map(appt => (
                  <div
                    key={appt._id}
                    className={`flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0 border-l-4 ${STATUS_COLOR[appt.status]}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#1b4332] text-base">{appt.tokenCode}</span>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="text-sm font-medium text-gray-800">{appt.patientName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {appt.department} · {appt.purpose}
                      </p>
                      {appt.doctorId ? (
                        <p className="text-xs text-[#2d6a4f] mt-0.5 font-medium">
                          Dr. {appt.doctorId.name}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-0.5">⚠ No doctor assigned</p>
                      )}
                      {appt.estimatedWait > 0 && appt.status === 'waiting' && (
                        <p className="text-xs text-gray-400 mt-0.5">Est. wait: ~{appt.estimatedWait} min</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      {appt.status === 'called' && (
                        <button
                          onClick={() => action(serveAppointment, appt._id)}
                          disabled={busy}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          <UserCheck size={13} /> Start Service
                        </button>
                      )}
                      {appt.status === 'serving' && (
                        <button
                          onClick={() => action(completeAppt, appt._id)}
                          disabled={busy}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#2d6a4f] text-white text-xs font-semibold rounded-lg hover:bg-[#1b4332] disabled:opacity-50 transition-colors"
                        >
                          <CheckCheck size={13} /> Complete
                        </button>
                      )}
                      {!['serving','completed','cancelled'].includes(appt.status) && (
                        <button
                          onClick={() => setReassignTarget(appt)}
                          disabled={busy}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw size={13} /> Reassign
                        </button>
                      )}
                      {!['completed','cancelled'].includes(appt.status) && (
                        <button
                          onClick={() => { if (window.confirm('Cancel this appointment?')) action(cancelAppt, appt._id); }}
                          disabled={busy}
                          className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          <XCircle size={13} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed / Cancelled */}
            {done.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed / Cancelled ({done.length})</p>
                </div>
                {done.slice(0, 20).map(appt => (
                  <div key={appt._id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0 opacity-60">
                    <span className="font-bold text-sm text-gray-600 w-20">{appt.tokenCode}</span>
                    <span className="text-sm text-gray-600 flex-1 truncate">{appt.patientName}</span>
                    <span className="text-xs text-gray-400 hidden md:block">{appt.department}</span>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}

            {appts.length === 0 && (
              <div className="text-center py-20">
                <UserPlus size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No appointments today</p>
                <p className="text-gray-300 text-sm mt-1">Click "Register Patient" to get started</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reassign modal */}
      {reassignTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-800 mb-1">Reassign Patient</h3>
            <p className="text-sm text-gray-500 mb-4">
              {reassignTarget.tokenCode} — {reassignTarget.patientName}
            </p>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
              {doctors
                .filter(d => d.department === reassignTarget.department && d.available)
                .map(d => (
                  <button
                    key={d._id}
                    onClick={() => handleReassign(reassignTarget._id, d._id)}
                    disabled={busy}
                    className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:bg-[#d8f3dc] hover:border-[#2d6a4f] transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.name}</p>
                      <p className="text-xs text-gray-400">{d.speciality || d.department}</p>
                    </div>
                    <span className="text-xs text-gray-400">{d.activeCount} active</span>
                  </button>
                ))}
              {doctors.filter(d => d.department === reassignTarget.department && d.available).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No available doctors in this department</p>
              )}
            </div>
            <button
              onClick={() => setReassignTarget(null)}
              className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
