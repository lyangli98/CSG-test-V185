import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuth();

  const isEpisode = location.pathname.startsWith('/episode') || location.pathname.startsWith('/lesson');
  const isWelcome = location.pathname === '/welcome';
  const isLeaderboard = location.pathname === '/leaderboard';
  const isProfile = location.pathname === '/profile';

  const tabs = user
    ? [
        { icon: Home, label: 'Home', to: '/welcome', active: isWelcome || isEpisode },
        { icon: Zap, label: 'Ranks', to: '/leaderboard', active: isLeaderboard },
        { icon: User, label: 'Profile', to: '/profile', active: isProfile },
      ]
    : [
        { icon: Home, label: 'Home', to: '/', active: location.pathname === '/' || isEpisode },
        { icon: Zap, label: 'Ranks', to: '/leaderboard', active: isLeaderboard },
        { icon: User, label: 'Profile', to: '/profile', active: isProfile },
      ];

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-white/40">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              to={tab.to}
              className="bottom-nav-item flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl"
            >
              <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                tab.active ? 'bg-cyan-50 scale-110' : 'scale-100'
              }`}>
                <Icon size={20} className={`transition-colors duration-300 ${tab.active ? 'text-[#0891b2]' : 'text-gray-400'}`} />
                {tab.active && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0891b2] anim-pop-in" />
                )}
              </div>
              <span className={`text-[11px] font-medium transition-colors duration-300 ${
                tab.active ? 'text-[#0891b2]' : 'text-gray-400'
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
