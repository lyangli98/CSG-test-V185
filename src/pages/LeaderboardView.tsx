import { useEffect, useMemo, useState } from 'react';
import { Crown, Flame, Snowflake, Sparkles, Medal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, type Profile } from '../lib/supabase';
import LeaderboardScene from '../components/LeaderboardScene';

interface LeaderRow {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  level: string;
  xp: number;
  streak: number;
  isUser: boolean;
}

/* ---------- Iceberg SVG ---------- */
function IcebergShape({ rank, id }: { rank: number; id: string }) {
  return (
    <svg viewBox="0 0 150 140" fill="none" className="w-full h-auto">
      <defs>
        <linearGradient id={`ice-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="25%" stopColor="#e0f2fe" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#bae6fd" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id={`snow-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <ellipse cx="75" cy="134" rx="52" ry="5" fill="rgba(8,145,178,0.06)" />
      <path
        d="M28,130 C24,115 27,95 32,78 C37,56 47,34 66,21 C81,13 99,16 113,29 C125,41 130,60 132,82 C134,100 130,124 128,130 Z"
        fill={`url(#ice-${id})`}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M32,78 C37,56 47,34 66,21 C81,13 99,16 113,29 C106,23 91,19 76,21 C61,23 49,31 41,49 C36,59 33,70 32,78 Z"
        fill={`url(#snow-${id})`}
      />
      <path d="M66,21 L70,92 M90,19 L85,97 M48,38 L52,104" stroke="rgba(255,255,255,0.25)" strokeWidth="0.7" fill="none" />
      <text
        x="75" y="100"
        textAnchor="middle"
        fontSize="48"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        fill="rgba(8,145,178,0.15)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="0.5"
      >
        {rank}
      </text>
    </svg>
  );
}

/* ---------- Podium peak: avatar + info + iceberg ---------- */
function IcebergPeak({
  player,
  isWinner,
  tapped,
  onTap,
}: {
  player: LeaderRow;
  isWinner: boolean;
  tapped: boolean;
  onTap: () => void;
}) {
  const containerMaxW = isWinner
    ? 'max-w-[110px] sm:max-w-[160px]'
    : player.rank === 2
      ? 'max-w-[95px] sm:max-w-[135px]'
      : 'max-w-[90px] sm:max-w-[130px]';
  const avatarSize = isWinner
    ? 'w-12 h-12 sm:w-16 sm:h-16 text-2xl sm:text-3xl'
    : 'w-10 h-10 sm:w-14 sm:h-14 text-xl sm:text-2xl';
  const ringClass = isWinner
    ? 'ring-4 ring-amber-300/60 shadow-[0_8px_28px_rgba(245,158,11,0.22)]'
    : 'ring-2 ring-cyan-200/50';

  return (
    <div
      onClick={onTap}
      className={`flex flex-col items-center flex-1 ${containerMaxW} relative cursor-pointer transition-transform duration-300`}
      style={{
        animation: 'iceberg-bob 4s ease-in-out infinite',
        animationDelay: `${player.rank * 0.3}s`,
        transform: tapped ? 'scale(1.06)' : 'scale(1)',
      }}
    >
      {isWinner && (
        <div
          className="absolute inset-0 -z-10 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle at 50% 30%, rgba(251,191,36,0.12), transparent 60%)' }}
        />
      )}
      {isWinner && (
        <Crown
          className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mb-1"
          fill="currentColor"
          style={{ animation: 'float 3s ease-in-out infinite', filter: 'drop-shadow(0 2px 4px rgba(245,158,11,0.3))' }}
        />
      )}
      <div className={`relative ${avatarSize} rounded-full bg-white flex items-center justify-center shadow-premium-sm ${ringClass} mb-1.5`}>
        {player.avatar}
      </div>
      <p className="text-xs sm:text-sm font-bold text-slate-800 text-center truncate max-w-full mb-0.5">{player.name}</p>
      <div className="inline-flex items-center gap-1 mb-1.5">
        <Sparkles className="w-3 h-3 text-cyan-400" />
        <span className="text-[10px] sm:text-xs font-bold text-cyan-600">{player.xp.toLocaleString()} XP</span>
      </div>
      <IcebergShape rank={player.rank} id={`peak-${player.rank}`} />
    </div>
  );
}

/* ---------- Animated ocean waves ---------- */
function OceanWaves() {
  return (
    <div className="absolute bottom-0 left-0 w-full h-24 pointer-events-none overflow-hidden">
      <svg
        className="absolute bottom-0 left-0 w-[200%] h-full"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        fill="none"
        style={{ animation: 'ocean-wave 9s linear infinite' }}
      >
        <path
          d="M0,60 C150,90 300,30 600,60 C900,90 1050,30 1200,60 L1200,100 L0,100 Z"
          fill="rgba(125,211,252,0.18)"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-[200%] h-full"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        fill="none"
        style={{ animation: 'ocean-wave 13s linear infinite reverse' }}
      >
        <path
          d="M0,70 C200,40 400,85 600,70 C800,55 1000,85 1200,70 L1200,100 L0,100 Z"
          fill="rgba(186,230,253,0.22)"
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-[200%] h-full"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        fill="none"
        style={{ animation: 'ocean-wave 7s linear infinite' }}
      >
        <path
          d="M0,80 C250,65 450,90 600,80 C800,70 950,90 1200,80 L1200,100 L0,100 Z"
          fill="rgba(8,145,178,0.14)"
        />
      </svg>
    </div>
  );
}

/* ---------- Frozen Ocean divider ---------- */
function FrozenOceanDivider() {
  return (
    <div className="relative my-5 sm:my-7 flex items-center gap-3">
      <svg viewBox="0 0 200 20" className="flex-1 h-4 sm:h-5" preserveAspectRatio="none" fill="none">
        <path d="M0,10 Q25,4 50,10 T100,10 T150,10 T200,10" stroke="rgba(8,145,178,0.18)" strokeWidth="1.5" fill="none" />
        <path d="M0,14 Q25,8 50,14 T100,14 T150,14 T200,14" stroke="rgba(8,145,178,0.08)" strokeWidth="1" fill="none" />
      </svg>
      <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-cyan-500/50 whitespace-nowrap">
        <Snowflake size={12} className="text-cyan-400/40" />
        Frozen Ocean
        <Snowflake size={12} className="text-cyan-400/40" />
      </div>
      <svg viewBox="0 0 200 20" className="flex-1 h-4 sm:h-5" preserveAspectRatio="none" fill="none">
        <path d="M0,10 Q25,4 50,10 T100,10 T150,10 T200,10" stroke="rgba(8,145,178,0.18)" strokeWidth="1.5" fill="none" />
        <path d="M0,14 Q25,8 50,14 T100,14 T150,14 T200,14" stroke="rgba(8,145,178,0.08)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

export default function LeaderboardView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tappedRow, setTappedRow] = useState<number | null>(null);
  const [tappedPodium, setTappedPodium] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_emoji, hsk_level, total_points, streak_days')
        .order('total_points', { ascending: false })
        .limit(100);
      if (cancelled || !data) return;
      const ranked: LeaderRow[] = (data as Profile[]).map((p, i) => ({
        id: p.id,
        rank: i + 1,
        name: p.display_name || 'Learner',
        avatar: p.avatar_emoji || '🎯',
        level: p.hsk_level || 'HSK 1',
        xp: p.total_points ?? 0,
        streak: p.streak_days ?? 0,
        isUser: p.id === user?.id,
      }));
      setRows(ranked);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  // Visual order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]];

  const handleRowTap = (rank: number) => {
    setTappedRow(rank);
    setTimeout(() => setTappedRow(null), 300);
  };

  const handlePodiumTap = (rank: number) => {
    setTappedPodium(rank);
    setTimeout(() => setTappedPodium(null), 400);
  };

  return (
    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-10">
      {/* Header */}
      <div className="relative text-center pt-8 pb-2">
        <div className="anim-bounce-top inline-flex items-center gap-2 bg-cyan-50 text-[#0891b2] px-4 py-1.5 rounded-full text-sm font-semibold mb-3">
          <Snowflake className="w-4 h-4" />
          Expedition Rankings
        </div>
        <h2 className="anim-slide-up text-3xl sm:text-4xl font-extrabold text-slate-900">Iceberg Leaderboard</h2>
        <p className="anim-slide-up stagger-2 text-slate-500 mt-2">Top explorers leading the expedition</p>
      </div>

      {/* Podium scene */}
      {!loading && top3.length === 3 && (
        <div
          className="anim-panel-in relative overflow-hidden rounded-3xl mt-6 pt-10 pb-3 px-3 sm:px-6"
          style={{
            background: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 35%, #f8fafc 100%)',
            border: '1px solid rgba(186, 230, 253, 0.35)',
          }}
        >
          <LeaderboardScene />
          <OceanWaves />

          <div className="relative flex items-end justify-center gap-1 sm:gap-4">
            {podiumOrder.map((player) => {
              if (!player) return null;
              return (
                <IcebergPeak
                  key={player.id}
                  player={player}
                  isWinner={player.rank === 1}
                  tapped={tappedPodium === player.rank}
                  onTap={() => handlePodiumTap(player.rank)}
                />
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-3 border-cyan-200 border-t-[#0891b2] rounded-full animate-spin" />
        </div>
      )}

      {/* Frozen Ocean divider */}
      {!loading && rows.length > 0 && <FrozenOceanDivider />}

      {/* Ranked list */}
      {!loading && rest.length > 0 && (
        <div className="relative bg-white rounded-2xl shadow-premium-sm border border-slate-100 overflow-hidden">
          {rest.map((player, idx) => {
            const isUser = player.isUser;
            const isLast = idx === rest.length - 1;
            return (
              <div
                key={player.id}
                onClick={() => handleRowTap(player.rank)}
                className={`anim-slide-in flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 cursor-pointer transition-all duration-200 ${
                  isUser ? 'bg-cyan-50/60' : 'hover:bg-slate-50'
                } ${!isLast ? 'border-b border-slate-100' : ''} ${
                  tappedRow === player.rank ? 'bg-cyan-100/40 scale-[1.01]' : ''
                }`}
                style={{
                  animationDelay: `${(idx + 4) * 50}ms`,
                  transform: tappedRow === player.rank ? 'translateX(4px)' : 'translateX(0)',
                }}
              >
                {/* Rank badge */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                    isUser ? 'bg-[#0891b2] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {player.rank}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-lg flex-shrink-0 ring-1 ring-slate-200/60">
                  {player.avatar}
                </div>

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm sm:text-base ${isUser ? 'text-[#0891b2]' : 'text-slate-900'}`}>
                    {player.name}
                  </p>
                  <p className="text-xs text-slate-400">{player.level}</p>
                </div>

                {/* Streak */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {player.streak > 0 ? (
                    <>
                      <Flame className="w-3.5 h-3.5 text-orange-400" fill="currentColor" />
                      <span className="text-xs font-semibold text-slate-500">{player.streak}d</span>
                    </>
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* XP */}
                <div className="text-right flex-shrink-0 min-w-[60px]">
                  <p className={`font-bold text-sm sm:text-base ${isUser ? 'text-[#0891b2]' : 'text-slate-700'}`}>
                    {player.xp.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">XP</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && (
        <div className="relative text-center py-16 text-slate-400">
          <Snowflake className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No learners yet. Be the first to chart the expedition!</p>
        </div>
      )}

      {/* Footer */}
      {!loading && rows.length > 0 && (
        <div className="anim-slide-up relative mt-6 flex items-center justify-center gap-2 text-slate-400">
          <Medal className="w-4 h-4" />
          <p className="text-xs">Rankings reset at the end of each month. Keep exploring to climb the ice!</p>
        </div>
      )}
    </div>
  );
}
