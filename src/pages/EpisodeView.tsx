import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  FileText,
  AlignLeft,
  Mic,
  Video,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { supabase, type Lesson } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getEpisodeById } from '../data/episodes';

export type ActivityKey = 'character' | 'sentence' | 'vlog' | 'speaking';

export interface ActivityConfig {
  key: ActivityKey;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  number: string;
}

export const ACTIVITIES: ActivityConfig[] = [
  { key: 'character', icon: FileText,  title: 'Character Test',   subtitle: 'Learn & practice characters',  number: '01' },
  { key: 'sentence',  icon: AlignLeft, title: 'Sentence Journey', subtitle: 'Fill blanks, complete dialogues', number: '02' },
  { key: 'vlog',      icon: Video,     title: 'Watch Vlog',       subtitle: 'Learn through video',           number: '03' },
  { key: 'speaking',  icon: Mic,       title: 'Speaking Test',    subtitle: 'Practice pronunciation',        number: '04' },
];

export default function EpisodeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const episode = getEpisodeById(Number(id));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [{ data: lessonData }, { data: progressData }] = await Promise.all([
        supabase.from('lessons').select('*').eq('episode_id', Number(id)).order('lesson_number', { ascending: true }),
        supabase.from('user_progress').select('lesson_id').eq('user_id', user.id),
      ]);
      setLessons(lessonData ?? []);
      setCompletedIds(new Set((progressData ?? []).map((p) => p.lesson_id)));
      setLoading(false);
    }
    loadData();
  }, [id, user]);

  if (!episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-gray-500 mb-4">Episode not found</p>
        <Link to="/welcome" className="text-[#0891b2] font-semibold hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-12">
      <Link
        to="/welcome"
        className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-premium-sm rounded-full pl-2.5 pr-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-premium-sm transition-all active:scale-95 mb-5"
      >
        <span className="w-6 h-6 rounded-full bg-[#0891b2] flex items-center justify-center">
          <ChevronLeft size={14} className="text-white" strokeWidth={2.5} />
        </span>
        Back to Dashboard
      </Link>

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0891b2] via-[#0e7490] to-[#155e75] px-6 py-8 sm:px-10 sm:py-10 mb-8">
        {/* decorative shapes */}
        <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white/[0.04] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute left-0 bottom-0 w-48 h-48 rounded-full bg-white/[0.03] translate-y-1/3 -translate-x-1/3" />
        <div className="absolute right-16 bottom-4 w-24 h-24 rounded-full bg-cyan-400/10 blur-xl" />
        {/* floating chinese characters */}
        {['学', '习', '语', '文'].map((c, i) => (
          <span
            key={i}
            className="float-char absolute text-white/[0.07] font-black select-none pointer-events-none"
            style={{ fontSize: `${40 + i * 12}px`, top: `${10 + i * 20}%`, right: `${6 + i * 8}%`, animationDelay: `${i * 0.6}s` }}
          >
            {c}
          </span>
        ))}

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-200/80 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                Episode {episode.id}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">{episode.title}</h1>
            <p className="text-cyan-200 text-sm mt-2">{episode.subtitle}</p>
          </div>

          {/* Progress ring area */}
          <div className="flex items-center gap-4 sm:flex-shrink-0">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke="white" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - progressPct / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-white">
                {progressPct}%
              </span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">{completedCount}/{lessons.length || 0}</p>
              <p className="text-cyan-200/80 text-xs mt-0.5">Lessons done</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section heading ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Choose Activity</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* ── Activity Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ACTIVITIES.map((act, i) => {
          const Icon = act.icon;
          const done = lessons.filter((l) => completedIds.has(l.id)).length;
          return (
            <button
              key={act.key}
              onClick={() => act.key === 'character'
                ? navigate(`/episode/${id}/activity/character`)
                : navigate(`/episode/${id}/activity/${act.key}`)}
              className="activity-card group relative bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 text-left overflow-hidden hover:border-[#0891b2]/30 hover:shadow-premium-lg hover:shadow-[#0891b2]/10 transition-all duration-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* number watermark */}
              <span className="absolute top-3 right-4 text-5xl font-black text-gray-100 select-none leading-none">
                {act.number}
              </span>

              {/* icon */}
              <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0891b2]/10 flex items-center justify-center mb-4 group-hover:bg-[#0891b2]/15 transition-colors">
                <Icon size={24} className="text-[#0891b2]" strokeWidth={1.8} />
              </div>

              {/* text */}
              <div className="relative z-10">
                <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">{act.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{act.subtitle}</p>
              </div>

              {/* footer row */}
              <div className="relative z-10 flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                {loading ? (
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <span className="text-xs font-semibold text-[#0891b2]">
                    {done}/{lessons.length || 0} done
                  </span>
                )}
                <div className="w-7 h-7 rounded-full bg-[#0891b2] flex items-center justify-center shadow-premium-blue shadow-[#0891b2]/10 group-hover:scale-110 transition-transform">
                  <ChevronRight size={14} className="text-white" strokeWidth={2.5} />
                </div>
              </div>

              {/* left accent bar */}
              <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-full bg-[#0891b2]/20 group-hover:bg-[#0891b2] group-hover:top-0 group-hover:bottom-0 transition-all duration-300" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
