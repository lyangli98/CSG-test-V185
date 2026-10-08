import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Check, X, LogOut, Zap, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, type Lesson } from '../lib/supabase';
import { EPISODES } from '../data/episodes';
import pointsIcon from '../assets/Icon_for_CSGWB/point.webp';
import dayStreakIcon from '../assets/Icon_for_CSGWB/day_streak.webp';
import lessonDoneIcon from '../assets/Icon_for_CSGWB/lessondone.webp';

const EMOJI_CHOICES = ['🎯', '⭐', '🌟', '🔥', '💎', '🚀', '🎨', '🌸', '👑', '⚡', '🌈', '🦊'];

const PRESET_AVATARS = [
  'https://mp3tourl.com/images/1784038361967-42de6ce7-178e-4820-8cae-47ffe05629d8.png',
  'https://mp3tourl.com/images/1784038409875-06cc18f4-c65f-48f8-90a3-696c8cdbd9ff.png',
  'https://mp3tourl.com/images/1784038430987-71913b19-407a-407d-84b1-a30989b62c5f.webp',
  'https://mp3tourl.com/images/1784038444033-4bd2c7d4-c95a-41a3-8064-d3b0a4552b76.jpg',
];

function AvatarDisplay({ url, emoji, size }: { url: string | null; emoji: string; size: number }) {
  const [imgError, setImgError] = useState(false);
  if (url && !imgError) {
    return (
      <img
        src={url}
        alt="Profile avatar"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-white/90 flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {emoji || '🎯'}
    </div>
  );
}

/* --- Atmospheric cloud background SVG --- */
function AtmosphericBg() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 420 280" preserveAspectRatio="xMidYMid slice" fill="none">
      {/* Blurred large cloud masses */}
      <ellipse cx="60" cy="50" rx="85" ry="48" fill="white" opacity="0.28" />
      <ellipse cx="110" cy="38" rx="55" ry="30" fill="white" opacity="0.22" />
      <ellipse cx="340" cy="65" rx="90" ry="50" fill="white" opacity="0.26" />
      <ellipse cx="390" cy="48" rx="60" ry="34" fill="white" opacity="0.18" />
      <ellipse cx="210" cy="20" rx="65" ry="28" fill="white" opacity="0.16" />
      <ellipse cx="160" cy="200" rx="70" ry="35" fill="white" opacity="0.10" />
      {/* Glow orbs */}
      <circle cx="80" cy="140" r="55" fill="rgba(186,230,253,0.25)" />
      <circle cx="330" cy="160" r="65" fill="rgba(147,210,250,0.20)" />
      {/* Sparkles */}
      <circle cx="30" cy="80" r="3" fill="white" opacity="0.6" />
      <circle cx="390" cy="35" r="2.5" fill="white" opacity="0.55" />
      <circle cx="180" cy="70" r="2" fill="white" opacity="0.45" />
      <circle cx="290" cy="18" r="2.5" fill="white" opacity="0.5" />
      <circle cx="140" cy="155" r="2" fill="white" opacity="0.38" />
      <circle cx="360" cy="110" r="2.2" fill="white" opacity="0.42" />
      {/* Cross sparkle shapes */}
      <path d="M310 45 L311.5 41 L313 45 L317 46.5 L313 48 L311.5 52 L310 48 L306 46.5 Z" fill="white" opacity="0.55" />
      <path d="M55 110 L56 107 L57 110 L60 111 L57 112 L56 115 L55 112 L52 111 Z" fill="white" opacity="0.45" />
    </svg>
  );
}

export default function ProfileView() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🎯');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const myPoints = profile?.total_points ?? 0;
      const [{ data: lessonData }, { data: progressData }, { count }, { count: aboveCount }] = await Promise.all([
        supabase.from('lessons').select('id, episode_id, lesson_number, title, subtitle, duration_minutes').order('episode_id', { ascending: true }).order('lesson_number', { ascending: true }),
        supabase.from('user_progress').select('lesson_id').eq('user_id', user.id),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('total_points', myPoints),
      ]);
      setLessons(lessonData ?? []);
      setCompletedIds(new Set((progressData ?? []).map((p) => p.lesson_id)));
      setTotalPlayers(count ?? 0);
      setUserRank((aboveCount ?? 0) + 1);
      setLoading(false);
    }
    loadData();
  }, [user, profile?.total_points]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setAvatarEmoji(profile.avatar_emoji);
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  async function handleSave() {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, avatar_emoji: avatarEmoji, avatar_url: avatarUrl })
      .eq('id', user.id);
    if (!error) {
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-lg sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 py-8 pb-24">
        <div className="h-48 bg-gradient-to-b from-sky-200 to-sky-100 rounded-3xl animate-pulse mb-4" />
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse mb-4" />
        <div className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const points = profile?.total_points ?? 0;
  const streak = profile?.streak_days ?? 0;
  const completedCount = completedIds.size;
  const totalLessons = lessons.length || 12;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const nextLesson = lessons.find((l) => !completedIds.has(l.id));
  const displayNameFinal = profile?.display_name || 'Learner';

  return (
    <div className="max-w-lg sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto pb-24 sm:pb-10">

      {/* ── Dreamy Hero Section with layered cards ── */}
      <div
        className="relative px-4 pt-6"
        style={{ background: 'linear-gradient(160deg, #bae6fd 0%, #d4edff 40%, #e8f6ff 100%)' }}
      >
        <AtmosphericBg />

        {!editing ? (
          <>
            {/* ── Floating Profile Card ── */}
            <div
              className="relative z-10 rounded-[28px] px-5 sm:px-8 pt-6 pb-14 mx-1"
              style={{
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.75)',
                boxShadow: '0 8px 32px rgba(56,189,248,0.18), 0 2px 8px rgba(255,255,255,0.6) inset',
              }}
            >
              <div className="flex items-center gap-4 sm:gap-5">
                {/* Avatar — circle with gradient ring, image via URL or emoji fallback */}
                <div className="relative flex-shrink-0">
                  <div
                    className="rounded-full"
                    style={{
                      padding: 3,
                      background: 'linear-gradient(135deg, #7dd3fc, #0ea5e9, #0891b2)',
                      boxShadow: '0 8px 24px rgba(56,189,248,0.25)',
                    }}
                  >
                    <div
                      className="rounded-full overflow-hidden flex items-center justify-center"
                      style={{
                        width: 76,
                        height: 76,
                        boxShadow: '0 1px 4px rgba(255,255,255,0.8) inset',
                      }}
                    >
                      <AvatarDisplay url={profile?.avatar_url ?? null} emoji={profile?.avatar_emoji ?? '🎯'} size={76} />
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff, #f0f9ff)',
                      border: '1px solid rgba(56,189,248,0.3)',
                      boxShadow: '0 3px 10px rgba(56,189,248,0.25)',
                    }}
                  >
                    <Edit3 size={12} className="text-sky-500" />
                  </button>
                </div>

                {/* Name + rank badge on one row, email below */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1
                      className="font-extrabold text-slate-800 leading-tight"
                      style={{ fontSize: 'clamp(14px, 4.5vw, 20px)' }}
                    >{displayNameFinal}</h1>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', color: '#0369a1' }}
                    >
                      <Trophy size={11} />
                      {userRank ? `Rank #${userRank}` : 'Explorer'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1.5">{user?.email}</p>
                </div>

              </div>
            </div>

            {/* ── Overlapping Statistics Bar — single continuous card with dividers ── */}
            <div
              className="relative z-20 mx-auto -mt-10"
              style={{
                width: '90%',
                borderRadius: 28,
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.95)',
                boxShadow: '0 24px 48px rgba(56,189,248,0.14), 0 2px 8px rgba(255,255,255,0.7) inset',
              }}
            >
              <div className="grid grid-cols-3">
                <StatItem iconSrc={pointsIcon} label="Points" value={points.toLocaleString()} />
                <StatItem iconSrc={dayStreakIcon} label="Streak" value={`${streak}d`} divider />
                <StatItem iconSrc={lessonDoneIcon} label="Lessons Done" value={`${completedCount}/${totalLessons}`} divider />
              </div>
            </div>

            {/* Bottom padding to clear gradient into white content area */}
            <div className="h-6" />
          </>
        ) : (
          /* ── Edit mode ── */
          <div className="relative z-10 mb-6 mx-auto max-w-xl">
            <div
              className="rounded-3xl px-5 py-5 mx-1"
              style={{
                background: 'rgba(255,255,255,0.60)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.75)',
                boxShadow: '0 8px 32px rgba(56,189,248,0.18)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-extrabold text-slate-800 text-lg">Edit Profile</h2>
                <button
                  onClick={() => setEditing(false)}
                  className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center"
                >
                  <X size={15} className="text-slate-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-sky-200 bg-white focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none text-sm font-medium"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Profile Picture</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_AVATARS.map((url) => (
                      <button
                        key={url}
                        onClick={() => setAvatarUrl(url)}
                        className={`relative rounded-full overflow-hidden transition ${
                          avatarUrl === url ? 'ring-2 ring-sky-500 ring-offset-1' : 'ring-1 ring-gray-200 hover:ring-sky-300'
                        }`}
                        style={{ width: 44, height: 44 }}
                      >
                        <img src={url} alt="Preset avatar" className="w-full h-full object-cover" />
                        {avatarUrl === url && (
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                            <Check size={9} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {avatarUrl && (
                    <button
                      onClick={() => setAvatarUrl(null)}
                      className="text-xs font-semibold text-slate-500 bg-white/70 px-3.5 py-2 rounded-xl hover:bg-white transition mt-2"
                    >
                      Clear picture
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Avatar Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_CHOICES.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setAvatarEmoji(emoji)}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${
                          avatarEmoji === emoji ? 'bg-white ring-2 ring-sky-500 shadow-premium-sm' : 'bg-white/60 hover:bg-white'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 bg-sky-500 text-white font-bold py-3 rounded-xl hover:bg-sky-600 transition active:scale-95 disabled:opacity-50 shadow-premium-sm"
                >
                  <Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-5 space-y-3.5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">

        {/* ── Overall Progress ── */}
        <div
          className="relative overflow-hidden rounded-[24px] p-5 lg:col-span-2"
          style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #f8fafc 100%)',
            border: '1px solid #bae6fd',
            boxShadow: '0 4px 20px rgba(56,189,248,0.10)',
          }}
        >
          <svg className="absolute right-3 bottom-0 pointer-events-none opacity-50" width="90" height="60" viewBox="0 0 90 60" fill="none">
            <path d="M0 60 L30 20 L45 35 L60 10 L90 60 Z" fill="rgba(186,230,253,0.5)" />
            <path d="M45 35 L60 10 L75 28 L90 20 L90 60 L45 60 Z" fill="rgba(125,211,252,0.35)" />
            <path d="M58 12 L60 10 L62 12 L60 11 Z" fill="white" opacity="0.9" />
          </svg>

          <div className="flex items-center gap-3 mb-3.5">
            <div
              className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #dbeafe, #93c5fd)',
                boxShadow: '0 4px 12px rgba(59,130,246,0.18)',
              }}
            >
              <span className="text-xl" style={{ animation: 'float 4s ease-in-out infinite' }}>✨</span>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-500/70">Overall Progress</p>
              <h3 className="text-2xl font-extrabold text-slate-800 leading-tight">{progressPct}%</h3>
            </div>
          </div>

          <div className="h-2.5 bg-white/60 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="text-xs font-semibold text-sky-600">
            {progressPct === 100 ? '🎉 All lessons complete!' : '⭐ Keep going! Every step counts.'}
          </p>
        </div>

        {/* ── Leaderboard Rank ── */}
        <div
          className="bg-white rounded-[24px] p-5"
          style={{ border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.18)',
                }}
              >
                <Trophy size={20} className="text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Leaderboard Rank</p>
                <p className="font-extrabold text-slate-800 leading-tight">{userRank ? `#${userRank}` : '—'} <span className="text-sm font-medium text-slate-400">of {totalPlayers}</span></p>
              </div>
            </div>
            <button
              onClick={() => navigate('/leaderboard')}
              className="text-xs font-semibold text-sky-600 bg-sky-50 px-3.5 py-2 rounded-xl hover:bg-sky-100 transition"
            >
              View
            </button>
          </div>
        </div>

        {/* ── Next Milestone CTA ── */}
        <div
          className="relative overflow-hidden rounded-[24px] p-5 flex items-center gap-3.5"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            boxShadow: '0 4px 20px rgba(59,130,246,0.10)',
          }}
        >
          <div
            className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
              boxShadow: '0 4px 12px rgba(59,130,246,0.15)',
            }}
          >
            <span className="text-xl" style={{ animation: 'float 5s ease-in-out infinite' }}>🎯</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Next Milestone</p>
            <p className="font-extrabold text-slate-800 text-sm leading-tight">
              Complete {Math.min(completedCount + 5, totalLessons)} Lessons
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{completedCount} / {Math.min(completedCount + 5, totalLessons)}</p>
          </div>
          <button
            onClick={() => nextLesson && navigate(`/lesson/${nextLesson.id}`)}
            disabled={!nextLesson}
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-blue-600 transition active:scale-95 disabled:opacity-40"
            style={{ boxShadow: '0 4px 14px rgba(59,130,246,0.30)' }}
          >
            <Zap size={14} /> Let's Go!
          </button>
        </div>

        {/* ── Sign Out ── */}
        <button
          onClick={signOut}
          className="w-full inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-slate-500 font-semibold py-3.5 rounded-[20px] hover:bg-gray-50 transition active:scale-95 text-sm lg:col-span-2"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <LogOut size={16} /> Sign Out
        </button>

      </div>
    </div>
  );
}

function StatItem({
  iconSrc,
  label,
  value,
  divider = false,
}: {
  iconSrc: string;
  label: string;
  value: string;
  divider?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className="flex items-center justify-center min-w-0"
      style={{
        gap: 'clamp(8px, 1.2vw, 12px)',
        padding: 'clamp(16px, 2.5vw, 24px) clamp(6px, 1.5vw, 16px)',
        borderLeft: divider ? '1px solid rgba(186,230,253,0.5)' : 'none',
      }}
    >
      {imgError ? (
        <div
          className="flex-shrink-0 rounded-full bg-sky-100 flex items-center justify-center"
          style={{
            width: 'clamp(28px, 4vw, 40px)',
            height: 'clamp(28px, 4vw, 40px)',
          }}
        >
          <Trophy size={16} className="text-sky-500" />
        </div>
      ) : (
        <img
          src={iconSrc}
          alt={label}
          className="select-none pointer-events-none flex-shrink-0"
          style={{
            width: 'clamp(28px, 4vw, 40px)',
            height: 'clamp(28px, 4vw, 40px)',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
          }}
          onError={() => setImgError(true)}
        />
      )}
      <div className="flex flex-col leading-none min-w-0">
        <span
          className="font-extrabold text-slate-800 truncate"
          style={{ fontSize: 'clamp(18px, 2.2vw, 24px)' }}
        >
          {value}
        </span>
        <span
          className="font-semibold text-slate-400 mt-0.5"
          style={{ fontSize: 'clamp(9px, 2.5vw, 12px)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
