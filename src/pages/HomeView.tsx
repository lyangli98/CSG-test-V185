import { useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Play, Sparkles, TrendingUp, Award } from 'lucide-react';
import { EPISODES, type Episode } from '../data/episodes';
import { useAuth } from '../context/AuthContext';

function RippleButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x - size / 2}px`;
      ripple.style.top = `${y - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
      onClick?.();
    },
    [onClick]
  );

  return (
    <button ref={btnRef} className={`flood-btn ${className}`} onClick={handleClick}>
      {children}
    </button>
  );
}

export default function HomeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const chineseChars = ['中', '文', '学', '习', '道', '语', '字', '美', '汉', '字'];

  const handleEpisodeSelect = (ep: Episode) => {
    if (user) {
      navigate(`/episode/${ep.id}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-10">
      {/* Hero Section */}
      <div className="relative gradient-animated bg-gradient-to-br from-[#0891b2] via-[#0e7490] to-[#155e75] rounded-3xl px-6 sm:px-12 pt-12 pb-16 sm:pt-16 sm:pb-20 overflow-hidden mt-6">
        {/* mesh blobs */}
        <div className="mesh-blob w-72 h-72 bg-cyan-400/30 top-0 right-10" />
        <div className="mesh-blob w-56 h-56 bg-cyan-300/20 bottom-0 left-1/4" style={{ animationDelay: '2s' }} />
        <div className="mesh-blob w-40 h-40 bg-sky-400/20 top-1/3 left-0" style={{ animationDelay: '4s' }} />

        {chineseChars.map((char, i) => (
          <span
            key={i}
            className="float-char absolute text-white/10 font-bold select-none pointer-events-none"
            style={{
              fontSize: `${28 + (i % 4) * 16}px`,
              top: `${8 + (i * 11) % 75}%`,
              left: `${3 + (i * 13) % 88}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            {char}
          </span>
        ))}

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <span className="anim-bounce-top inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-100 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 mb-5">
            <Sparkles size={13} /> Immersive Vlog-Style Learning
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            <span className="anim-slide-up inline-block">Learn Chinese</span>
            <br />
            <span className="anim-slide-up stagger-2 inline-block">With Vlog</span>
            <br />
            <span className="anim-slide-up stagger-3 inline-block bg-gradient-to-r from-cyan-100 to-sky-200 bg-clip-text text-transparent">
              Step By Step
            </span>
          </h1>

          <p className="anim-slide-up stagger-4 text-cyan-100 mt-6 text-base sm:text-lg max-w-md mx-auto">
            Master Chinese characters, sentences, and pronunciation through immersive vlog-style lessons.
          </p>

          <div className="anim-slide-up stagger-5 mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {user ? (
              <RippleButton
                className="bg-white text-[#0891b2] font-bold px-10 py-3.5 rounded-full text-base shadow-premium hover:shadow-premium-lg transition-shadow"
                onClick={() => navigate('/welcome')}
              >
                Go to Dashboard
              </RippleButton>
            ) : (
              <>
                <RippleButton
                  className="bg-white text-[#0891b2] font-bold px-10 py-3.5 rounded-full text-base shadow-premium hover:shadow-premium-lg transition-shadow"
                  onClick={() => navigate('/signup')}
                >
                  Get Started Free
                </RippleButton>
                <RippleButton
                  className="bg-white/10 backdrop-blur-md text-white border border-white/30 font-semibold px-8 py-3.5 rounded-full text-base hover:bg-white/20 transition-colors"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </RippleButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">
        <FeatureCard icon={Play} title="Vlog Lessons" subtitle="Watch & learn" delay="stagger-1" />
        <FeatureCard icon={TrendingUp} title="Track Progress" subtitle="Stay motivated" delay="stagger-2" />
        <FeatureCard icon={Award} title="Earn Points" subtitle="Climb the ranks" delay="stagger-3" />
      </div>

      {/* Episodes Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-gray-900">Episodes</h2>
          <span className="text-sm text-gray-400 font-medium">1 / 6 unlocked</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EPISODES.map((ep, i) => (
            <div
              key={ep.id}
              onClick={() => ep.unlocked && handleEpisodeSelect(ep)}
              className={`episode-card anim-slide-in ${ep.unlocked ? 'cursor-pointer' : 'opacity-80'} bg-white rounded-2xl px-5 py-5 flex items-center gap-4 shadow-premium-sm border border-gray-100 ${
                ep.unlocked ? 'hover:shadow-premium-sm hover:border-cyan-200' : ''
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 transition-transform ${
                  ep.unlocked
                    ? 'bg-gradient-to-br from-[#0891b2] to-[#155e75] text-white shadow-premium-blue'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {ep.unlocked ? ep.id : <Lock className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold mb-0.5 ${ep.unlocked ? 'text-[#0891b2]' : 'text-gray-400'}`}>
                  Episode {ep.id}
                </p>
                <p className={`font-bold text-lg leading-tight ${ep.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                  {ep.title}
                </p>
                <p className={`text-sm mt-0.5 ${ep.unlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                  {ep.subtitle}
                </p>
              </div>

              {ep.unlocked && (
                <RippleButton
                  className="bg-[#0891b2] text-white text-sm font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap shadow-premium-sm hover:bg-[#0e7490] transition-colors"
                  onClick={() => handleEpisodeSelect(ep)}
                >
                  {user ? 'Start' : 'Sign In'}
                </RippleButton>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner for non-logged-in users */}
      {!user && (
        <div className="anim-slide-up mt-8 relative overflow-hidden bg-gradient-to-r from-cyan-50 to-sky-50/40 rounded-2xl border border-cyan-100 p-6 text-center">
          <div className="mesh-blob w-32 h-32 bg-cyan-200/30 -top-8 -right-8" />
          <div className="relative">
            <Sparkles size={24} className="text-[#0891b2] mx-auto mb-2" />
            <h3 className="font-bold text-gray-900 mb-1">Ready to start learning?</h3>
            <p className="text-sm text-gray-500 mb-4">Create a free account and begin your Chinese learning journey today.</p>
            <Link
              to="/signup"
              className="flood-btn inline-flex items-center gap-2 bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white font-semibold px-6 py-3 rounded-xl shadow-premium-blue shadow-cyan-500/10 hover:shadow-cyan-500/10 transition-all active:scale-95"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, subtitle, delay = '' }: { icon: typeof Play; title: string; subtitle: string; delay?: string }) {
  return (
    <div className={`card-elevated anim-slide-up ${delay} p-4 text-center`}>
      <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center mx-auto mb-2">
        <Icon size={20} className="text-[#0891b2]" />
      </div>
      <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}
