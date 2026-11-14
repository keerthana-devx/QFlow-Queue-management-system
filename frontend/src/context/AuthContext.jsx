import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qflow_user')); } catch { return null; }
  });
  const navigate = useNavigate();

  const saveSession = ({ token, user }) => {
    localStorage.setItem('qflow_token', token);
    localStorage.setItem('qflow_user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('qflow_token');
    localStorage.removeItem('qflow_user');
    setUser(null);
    navigate('/login');
  };

  const registerUser = async (data) => {
    const res = await api.register(data);
    saveSession(res.data);
    navigate('/dashboard');
  };

  const loginUser = async (data) => {
    const res = await api.login(data);
    saveSession(res.data);
    navigate('/dashboard');
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
