import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Landing     from './pages/Landing';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Dashboard   from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Doctors     from './pages/Doctors';
import History     from './pages/History';
import Analytics   from './pages/Analytics';
import LiveDisplay from './pages/LiveDisplay';

function Private({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PrivateWithSocket({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <SocketProvider user={user}>{children}</SocketProvider>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"            element={<Landing />} />
      <Route path="/login"       element={<Login />} />
      <Route path="/register"    element={<Register />} />
      <Route path="/display/:managerId" element={<LiveDisplay />} />

      <Route path="/dashboard"   element={<PrivateWithSocket><Dashboard /></PrivateWithSocket>} />
      <Route path="/appointments" element={<PrivateWithSocket><Appointments /></PrivateWithSocket>} />
      <Route path="/doctors"     element={<PrivateWithSocket><Doctors /></PrivateWithSocket>} />
      <Route path="/history"     element={<Private><History /></Private>} />
      <Route path="/analytics"   element={<Private><Analytics /></Private>} />

      {/* legacy redirects */}
      <Route path="/queue"       element={<Navigate to="/appointments" replace />} />
      <Route path="*"            element={<Navigate to="/" replace />} />
    </Routes>
  );
}
