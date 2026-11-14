import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarClock, Stethoscope, History, BarChart2 } from 'lucide-react';
import Logo from './Logo';

const links = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Overview'     },
  { to: '/appointments', icon: CalendarClock,   label: 'Queue'        },
  { to: '/doctors',      icon: Stethoscope,     label: 'Doctors'      },
  { to: '/history',      icon: History,         label: 'History'      },
  { to: '/analytics',    icon: BarChart2,       label: 'Analytics'    },
];

export default function Navbar() {
  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <Logo variant="compact" size="sm" />
      </header>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-[#2d6a4f]' : 'text-gray-400'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
