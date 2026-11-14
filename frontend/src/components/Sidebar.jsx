import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarClock, Stethoscope, History, BarChart2, Monitor, LogOut, Wifi, WifiOff } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const links = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Overview'      },
  { to: '/appointments', icon: CalendarClock,   label: 'Appointments'  },
  { to: '/doctors',      icon: Stethoscope,     label: 'Doctors'       },
  { to: '/history',      icon: History,         label: 'History'       },
  { to: '/analytics',    icon: BarChart2,       label: 'Analytics'     },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const { connected }    = useSocket() || {};

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r border-gray-100 px-4 py-6">
      <div className="mb-8">
        <Logo variant="full" size="sm" />
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-[#d8f3dc] text-[#1b4332]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        <a
          href={`/display/${user?.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors mt-1"
        >
          <Monitor size={18} />
          Live Display ↗
        </a>
      </nav>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 px-3 mb-2">
          {connected
            ? <Wifi size={12} className="text-green-500" />
            : <WifiOff size={12} className="text-gray-300" />}
          <span className="text-xs text-gray-400">{connected ? 'Live' : 'Offline'}</span>
        </div>
        <p className="text-xs text-gray-400 mb-0.5 px-3 truncate font-medium">{user?.name}</p>
        <p className="text-xs text-gray-400 mb-3 px-3 truncate">{user?.organisation}</p>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
