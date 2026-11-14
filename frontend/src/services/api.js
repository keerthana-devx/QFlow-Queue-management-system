import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login    = (data) => api.post('/auth/login', data);

// Appointments
export const getAppointments  = ()     => api.get('/appointments');
export const getHistory       = (p)    => api.get('/appointments/history', { params: p });
export const registerPatient  = (data) => api.post('/appointments/register', data);
export const callNext         = (dept) => api.post('/appointments/call-next', { department: dept });
export const serveAppointment = (id)   => api.post(`/appointments/${id}/serve`);
export const completeAppt     = (id)   => api.post(`/appointments/${id}/complete`);
export const cancelAppt       = (id)   => api.post(`/appointments/${id}/cancel`);
export const reassignAppt     = (id, doctorId) => api.patch(`/appointments/${id}/reassign`, { doctorId });
export const getPublicQueue   = (mid)  => api.get(`/appointments/public/${mid}`);

// Doctors
export const getDoctors      = ()     => api.get('/doctors');
export const addDoctor       = (data) => api.post('/doctors', data);
export const updateDoctor    = (id, data) => api.patch(`/doctors/${id}`, data);
export const deleteDoctor    = (id)   => api.delete(`/doctors/${id}`);

// Analytics
export const getAnalytics = () => api.get('/analytics');

// Legacy (kept for backward compat)
export const getQueue    = ()     => api.get('/queue');
export const issueToken  = (data) => api.post('/queue/issue', data);
export const resetQueue  = ()     => api.delete('/queue/reset');
