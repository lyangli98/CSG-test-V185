import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Sparkles, Star, TrendingUp, Award, Zap, Snowflake } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, type Lesson } from '../lib/supabase';
import { EPISODES } from '../data/episodes';
import { LEADERBOARD } from '../data/leaderboard';
import IceHeroScene from '../components/IceHeroScene';
import welPenguinBook from '../assets/Icon_for_CSGWB/wel_penguin_book.webp';

function useCountUp(target: number, duration = 1200, active = true) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);
  return value;
}

export default function WelcomeView() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      if (!user) return;
      const [{ data: lessonData }, { data: progressData }] = await Promise.all([
        supabase.from('lessons').select('*').order('episode_id', { ascending: true }).order('lesson_number', { ascending: true }),
        supabase.from('user_progress').select('lesson_id').eq('user_id', user.id),
      ]);
      setLessons(lessonData ?? []);
      setCompletedIds(new Set((progressData ?? []).map((p) => p.lesson_id)));
      setLoading(false);
    }
    loadData();
  }, [user]);

  const completedCount = completedIds.size;
  const totalLessons = lessons.length || 12;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const nextLesson = lessons.find((l) => !completedIds.has(l.id));
  const currentEpisode = nextLesson ? nextLesson.episode_id : 1;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = profile?.display_name || (user?.email ? user.email.split('@')[0] : 'Learner');

  const streak = useCountUp(profile?.streak_days ?? 0, 1000, mounted);
  const points = useCountUp(profile?.total_points ?? 0, 1400, mounted);
  const pctValue = useCountUp(progressPct, 1200, mounted);

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const today = new Date();
  const todayDayOfWeek = today.getDay(); // 0=Sun
  // Show Mon–Sun of the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    // i=0 is Monday (day 1), i=6 is Sunday (day 0)
    const targetDay = i === 6 ? 0 : i + 1;
    const diff = targetDay - todayDayOfWeek;
    d.setDate(today.getDate() + diff);
    const isPast = diff < 0;
    const isTodaySlot = diff === 0;
    return {
      label: DAY_LABELS[targetDay],
      date: d,
      done: isPast || (isTodaySlot && (profile?.streak_days ?? 0) > 0),
      isToday: isTodaySlot,
      isFuture: diff > 0,
    };
  });
  const todayFormatted = today.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-10">
      {/* Hero greeting card — cozy penguin reading a book */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c4a6e] via-[#075985] to-[#0e7490] mb-8 shadow-premium-lg shadow-cyan-950/20">
        <IceHeroScene />

        {/* Content: ROW layout at all sizes — text left, mascot pinned right, vertically centered */}
        <div className="relative z-10 w-full p-4 sm:p-6 lg:p-8 flex flex-row items-center gap-1 sm:gap-6 lg:gap-8">
          {/* Greeting text — left column, takes most of the width on mobile */}
          <div className="flex-1 min-w-0">
            {/* Header row: icon + greeting label (lighter weight) */}
            <div className="flex items-center gap-2 text-cyan-200 text-sm sm:text-base lg:text-lg font-normal mb-2">
              <Snowflake size={16} className="lg:hidden anim-fade-in" />
              <Snowflake size={18} className="hidden lg:block anim-fade-in" />
              <span className="inline-flex" style={{ perspective: '200px' }}>
                {greeting.split('').map((char, i) => (
                  <span
                    key={i}
                    className="inline-block"
                    style={{
                      animation: `letter-reveal 0.5s var(--ease-out-expo) both`,
                      animationDelay: `${i * 35}ms`,
                      transformOrigin: 'bottom',
                      whiteSpace: char === ' ' ? 'pre' : 'normal',
                    }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </div>

            {/* Username on its own line — bold, larger, with wave emoji inline */}
            <h1 className="anim-slide-up text-xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-1.5 sm:mb-2 tracking-tight flex items-center gap-2 flex-wrap">
              <span>{displayName}</span>
              <span className="anim-pop-in" style={{ animationDelay: '0.4s' }} aria-hidden="true">👋</span>
            </h1>

            {/* Subtitle — lighter secondary weight */}
            <p className="anim-slide-up stagger-2 text-cyan-100/80 text-xs sm:text-base lg:text-lg font-light mb-3 sm:mb-5 max-w-md">
              Ready to continue your Chinese learning journey today?
            </p>

            {/* Status / CTA — distinct pill button, contrasting background, icon + label + chevron */}
            {nextLesson ? (
              <button
                onClick={() => navigate(`/lesson/${nextLesson.id}`)}
                className="flood-btn anim-slide-up stagger-3 inline-flex items-center gap-1.5 sm:gap-2 bg-white text-[#075985] font-semibold px-3 sm:px-5 py-2 sm:py-2.5 lg:px-6 lg:py-3 rounded-full text-xs sm:text-sm lg:text-base shadow-premium hover:shadow-premium-lg transition-all active:scale-95 max-w-full"
              >
                <Zap size={14} className="lg:hidden flex-shrink-0" />
                <Zap size={18} className="hidden lg:block flex-shrink-0" />
                <span className="truncate">Continue with Lesson {nextLesson.lesson_number}: {nextLesson.title}</span>
                <ChevronRight size={14} className="lg:hidden flex-shrink-0" />
                <ChevronRight size={18} className="hidden lg:block flex-shrink-0" />
              </button>
            ) : (
              <div className="anim-pop-in inline-flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-md text-white font-semibold px-3 sm:px-5 py-2 sm:py-2.5 lg:px-6 lg:py-3 rounded-full text-xs sm:text-sm lg:text-base max-w-full">
                <Award size={14} className="lg:hidden flex-shrink-0" />
                <Award size={16} className="hidden lg:block flex-shrink-0" />
                <span className="text-left">All lessons complete! You're a champion!</span>
              </div>
            )}
          </div>

          {/* Penguin mascot — pinned to right edge, vertically centered, shrinks on small screens */}
          <div
            className="relative flex-shrink-0 flex items-end justify-end anim-pop-in"
            style={{
              width: 'clamp(96px, 30vw, 200px)',
              height: 'clamp(96px, 26vw, 160px)',
              overflow: 'visible',
            }}
          >
            {/* Decorative sparkle/star accents near the mascot */}
            <Star
              size={14}
              className="absolute -top-1 left-1 text-cyan-200/70 pointer-events-none z-20"
              fill="currentColor"
              style={{ animation: 'shimmer 2.5s ease-in-out infinite' }}
            />
            <Star
              size={10}
              className="absolute top-6 -right-1 text-amber-200/70 pointer-events-none z-20"
              fill="currentColor"
              style={{ animation: 'shimmer 2.5s ease-in-out infinite 0.7s' }}
            />
            <Star
              size={12}
              className="absolute bottom-2 -left-2 text-sky-200/60 pointer-events-none z-20"
              fill="currentColor"
              style={{ animation: 'shimmer 2.5s ease-in-out infinite 1.4s' }}
            />
            <img
              src={welPenguinBook}
              alt="Penguin reading a book"
              className="pointer-events-none select-none"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'bottom center',
                filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.28))',
                animation: 'float 6s ease-in-out infinite',
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>
      </div>

      {/* Day Streak — icy widget */}
      <div className="anim-slide-up stagger-1 mb-6">
        <div
          className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdfa 100%)',
            border: '1px solid #bae6fd',
            boxShadow: '0 24px 60px rgba(8,145,178,0.06)',
          }}
        >
          {/* Subtle snowflake decoration */}
          <Snowflake size={120} className="absolute -top-4 -right-4 text-cyan-100/40 pointer-events-none" />

          {/* Header: date left, streak pill badge right */}
          <div className="relative flex items-center justify-between mb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-600/60 mb-1">Day Streak</p>
              <p className="text-base sm:text-lg font-semibold text-slate-700 truncate">{todayFormatted}</p>
            </div>
            <div
              className="group flex-shrink-0 flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 cursor-default transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #ecfeff 55%, #cffafe 100%)',
                border: '1px solid rgba(8,145,178,0.2)',
                boxShadow: '0 16px 40px rgba(8,145,178,0.06), inset 0 1px 2px rgba(255,255,255,0.9)',
              }}
            >
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-none tracking-tight">{streak}</span>
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full transition-transform duration-200 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' }}
              >
                <Flame
                  size={16}
                  className="text-orange-400"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(251,146,60,0.6))' }}
                />
              </div>
            </div>
          </div>

          {/* Seven day indicators */}
          <div className="relative flex items-end justify-between gap-1.5 sm:gap-2.5">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <div
                  className={`w-full aspect-square max-w-[48px] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                    d.isToday
                      ? 'bg-cyan-500 shadow-[0_16px_40px_rgba(8,145,178,0.08)]'
                      : d.done
                      ? 'bg-orange-50 border border-orange-100'
                      : 'bg-white/60 border border-cyan-100'
                  }`}
                >
                  {d.isToday ? (
                    <Snowflake size={18} className="text-white" />
                  ) : d.done ? (
                    <Flame
                      size={18}
                      className="text-orange-400"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(251,146,60,0.45))' }}
                    />
                  ) : null}
                </div>
                <span className={`text-[11px] font-semibold tracking-wide ${
                  d.isToday ? 'text-cyan-600' : d.done ? 'text-orange-400' : 'text-cyan-200'
                }`}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rank + Progress + XP — icy aurora card */}
      <div className="anim-slide-up stagger-4 mb-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c4a6e] via-[#075985] to-[#0e7490] p-4 sm:p-5 shadow-premium-lg shadow-cyan-950/20">
          <div className="absolute w-40 h-40 rounded-full bg-cyan-300/15 blur-3xl -top-10 -right-10 pointer-events-none" />
          <div className="absolute w-28 h-28 rounded-full bg-sky-300/10 blur-3xl bottom-0 left-1/3 pointer-events-none" />
          {/* Aurora shimmer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(110deg, transparent 30%, rgba(125,211,252,0.06) 50%, transparent 70%)',
              animation: 'aurora-shift 10s ease-in-out infinite',
            }}
          />

          <div className="relative z-10 flex items-center gap-4 sm:gap-6">
            {/* Badge */}
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 120, height: 120 }}>
              <svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'float 4s ease-in-out infinite', filter: 'drop-shadow(0 0 22px rgba(125,211,252,0.4))' }}>
                <path d="M28 68 C10 56, 4 40, 14 30 C18 26, 24 28, 26 34 C18 38, 18 50, 28 58 Z" fill="url(#wL)" opacity="0.95" />
                <path d="M26 60 C10 52, 6 38, 16 30 C20 42, 24 52, 30 60 Z" fill="url(#wL2)" opacity="0.6" />
                <path d="M92 68 C110 56, 116 40, 106 30 C102 26, 96 28, 94 34 C102 38, 102 50, 92 58 Z" fill="url(#wR)" opacity="0.95" />
                <path d="M94 60 C110 52, 114 38, 104 30 C100 42, 96 52, 90 60 Z" fill="url(#wR2)" opacity="0.6" />
                <circle cx="60" cy="62" r="34" fill="none" stroke="url(#ringStroke)" strokeWidth="3" />
                <circle cx="60" cy="62" r="30" fill="url(#badgeFill)" />
                <circle cx="60" cy="62" r="26" fill="none" stroke="rgba(125,211,252,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
                <polygon points="60,14 54,22 60,26 66,22" fill="url(#gem)" filter="url(#gemGlow)" />
                <polygon points="60,26 54,22 60,32 66,22" fill="url(#gemShadow)" />
                <circle cx="44" cy="20" r="2.5" fill="#bae6fd" opacity="0.8" style={{ animation: 'shimmer 2s ease-in-out infinite' }} />
                <circle cx="76" cy="20" r="2.5" fill="#bae6fd" opacity="0.8" style={{ animation: 'shimmer 2s ease-in-out infinite 0.5s' }} />
                <text x="60" y="70" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="900" fill="white" fontFamily="system-ui,sans-serif" style={{ letterSpacing: '-1px' }}>
                  {LEADERBOARD.find((e) => e.isUser)?.rank ?? 4}
                </text>
                <defs>
                  <linearGradient id="wL" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#d4b483" /><stop offset="100%" stopColor="#a37c3c" /></linearGradient>
                  <linearGradient id="wL2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f0d090" stopOpacity="0.7" /><stop offset="100%" stopColor="#a37c3c" stopOpacity="0" /></linearGradient>
                  <linearGradient id="wR" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d4b483" /><stop offset="100%" stopColor="#a37c3c" /></linearGradient>
                  <linearGradient id="wR2" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f0d090" stopOpacity="0.7" /><stop offset="100%" stopColor="#a37c3c" stopOpacity="0" /></linearGradient>
                  <linearGradient id="ringStroke" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7dd3fc" /><stop offset="100%" stopColor="#0c4a6e" /></linearGradient>
                  <radialGradient id="badgeFill" cx="40%" cy="35%"><stop offset="0%" stopColor="#0e7490" /><stop offset="100%" stopColor="#082f49" /></radialGradient>
                  <linearGradient id="gem" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#e0f2fe" /><stop offset="100%" stopColor="#0ea5e9" /></linearGradient>
                  <linearGradient id="gemShadow" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#0284c7" /><stop offset="100%" stopColor="#075985" /></linearGradient>
                  <filter id="gemGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
              </svg>
            </div>

            {/* Right: rank label + progress + XP */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <p className="font-extrabold text-white text-lg leading-none">Rank {LEADERBOARD.find((e) => e.isUser)?.rank ?? 4}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200 bg-cyan-400/15 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                  Explorer
                </span>
              </div>

              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/60">Lessons</span>
                  <span className="text-[11px] font-semibold text-cyan-100/80">{completedCount}/{totalLessons} · {pctValue}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 shadow-[0_8px_24px_rgba(125,211,252,0.08)]"
                    style={{ width: `${progressPct}%`, transition: 'width 1.4s var(--ease-out-expo)' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/60">XP</span>
                  <span className="text-[11px] font-semibold text-amber-100/80">{points.toLocaleString()} pts</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-300 shadow-[0_8px_24px_rgba(252,211,77,0.08)]"
                    style={{ width: `${Math.min(points, 100)}%`, transition: 'width 1.4s var(--ease-out-expo)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue learning — episode cards */}
      <h2 className="font-bold text-slate-800 mb-3">Continue Learning</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6">
        {EPISODES.map((ep, i) => {
          const epLessons = lessons.filter((l) => l.episode_id === ep.id);
          const epCompleted = epLessons.filter((l) => completedIds.has(l.id)).length;
          const epProgress = epLessons.length > 0 ? Math.round((epCompleted / epLessons.length) * 100) : 0;
          const isCurrent = ep.id === currentEpisode;
          const isLocked = !ep.unlocked;

          return (
            <button
              key={ep.id}
              onClick={() => !isLocked && navigate(`/episode/${ep.id}`)}
              disabled={isLocked}
              className={`anim-slide-in text-left card-elevated p-5 ${
                isLocked ? 'opacity-60 cursor-not-allowed' : isCurrent ? 'ring-2 ring-cyan-100' : ''
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white transition-transform ${
                  isLocked ? 'bg-gray-300' : 'bg-gradient-to-br from-cyan-500 to-sky-700 group-hover:scale-110'
                }`}>
                  {ep.id}
                </div>
                {isCurrent && !isLocked && (
                  <span className="anim-pop-in text-xs font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-900 mb-0.5">{ep.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{ep.subtitle}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full progress-fill bg-gradient-to-r from-cyan-500 to-sky-400 ${isLocked ? '!bg-gray-300' : ''}`}
                    style={{ width: `${epProgress}%`, transition: 'width 1s var(--ease-out-expo)' }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-medium">{epCompleted}/{epLessons.length || 2}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Motivational quote — icy variant */}
      <div className="anim-slide-up relative overflow-hidden bg-gradient-to-r from-cyan-50 to-sky-50/40 rounded-2xl border border-cyan-100 p-5 mb-6">
        <div className="mesh-blob w-32 h-32 bg-cyan-200/30 -top-8 -right-8" />
        <Snowflake size={80} className="absolute -bottom-2 -left-2 text-cyan-100/40 pointer-events-none" />
        <div className="relative flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Daily Wisdom</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              "学如逆水行舟，不进则退" — Learning is like rowing upstream: not advancing means dropping back. Keep practicing every day!
            </p>
          </div>
        </div>
      </div>

      {/* Admin link */}
      {isAdmin && (
        <Link
          to="/admin"
          className="episode-card block bg-gray-900 text-white rounded-2xl p-5 hover:bg-gray-800 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold">Admin Dashboard</p>
              <p className="text-sm text-gray-400">Manage lessons, announcements, and users</p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </Link>
      )}
    </div>
  );
}
