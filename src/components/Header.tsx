import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Header() {
  const location = useLocation();
  const { user, isAdmin, loading } = useAuth();

  const isHome = location.pathname === '/';
  const isEpisode = location.pathname.startsWith('/episode') || location.pathname.startsWith('/lesson');
  const isLeaderboard = location.pathname === '/leaderboard';
  const isProfile = location.pathname === '/profile';
  const isWelcome = location.pathname === '/welcome';
  const isAdminPage = location.pathname.startsWith('/admin');

  const navItems = loading ? [] : user
    ? [
        { label: 'Home', to: '/welcome', active: isWelcome || isEpisode },
        { label: 'Leaderboard', to: '/leaderboard', active: isLeaderboard },
        { label: 'Profile', to: '/profile', active: isProfile },
      ]
    : [
        { label: 'Home', to: '/', active: isHome || isEpisode },
        { label: 'Leaderboard', to: '/leaderboard', active: isLeaderboard },
        { label: 'Profile', to: '/profile', active: isProfile },
      ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to={user ? '/welcome' : '/'} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0891b2] to-[#155e75] flex items-center justify-center shadow-premium-blue shadow-cyan-500/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
            <span className="text-white font-extrabold text-lg">C</span>
          </div>
          <span className="font-extrabold text-xl text-gray-900 hidden sm:block">CSG</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`nav-link relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                item.active
                  ? 'bg-cyan-50 text-[#0891b2] shadow-premium-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/60'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                isAdminPage
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/60'
              }`}
            >
              <Shield size={14} /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1">
          {loading ? (
            <div className="w-9 h-9" />
          ) : user ? (
            <NotificationBell />
          ) : (
            <Link
              to="/login"
              className="flood-btn px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white hover:shadow-premium-blue hover:shadow-cyan-500/10 transition-all active:scale-95"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
