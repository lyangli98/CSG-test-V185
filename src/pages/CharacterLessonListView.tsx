import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Play, CheckCircle2, Lock, Plus, Sparkles } from 'lucide-react';
import { supabase, type CharLesson, type CharProgress } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getEpisodeById } from '../data/episodes';
import { openLessonSession } from '../lib/usePreventBack';

export default function CharacterLessonListView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const episode = getEpisodeById(Number(id));
  const [lessons, setLessons] = useState<CharLesson[]>([]);
  const [progress, setProgress] = useState<Record<string, CharProgress>>({});
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [{ data: lessonData }, { data: progData }] = await Promise.all([
        supabase.from('char_lessons').select('*').eq('episode_id', Number(id)).order('sort_order', { ascending: true }),
        supabase.from('char_progress').select('*').eq('user_id', user.id),
      ]);
      const lessons = (lessonData ?? []) as CharLesson[];
      setLessons(lessons);
      const progMap: Record<string, CharProgress> = {};
      (progData ?? []).forEach((p: CharProgress) => { progMap[p.lesson_id] = p; });
      setProgress(progMap);

      // word counts
      if (lessons.length > 0) {
        const { data: words } = await supabase
          .from('char_words')
          .select('lesson_id')
          .in('lesson_id', lessons.map((l) => l.id));
        const counts: Record<string, number> = {};
        (words ?? []).forEach((w: { lesson_id: string }) => {
          counts[w.lesson_id] = (counts[w.lesson_id] || 0) + 1;
        });
        setWordCounts(counts);
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

  if (!episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 mb-4">Episode not found</p>
        <Link to="/welcome" className="text-[#0891b2] font-semibold">Back to Dashboard</Link>
      </div>
    );
  }

  const completedCount = Object.keys(progress).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-12">
      <Link
        to={`/episode/${id}`}
        className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-premium-sm rounded-full pl-2.5 pr-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-premium-sm transition-all active:scale-95 mb-5"
      >
        <span className="w-6 h-6 rounded-full bg-[#0891b2] flex items-center justify-center">
          <ChevronLeft size={14} className="text-white" strokeWidth={2.5} />
        </span>
        Back to Episode
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0891b2] via-[#0e7490] to-[#155e75] px-6 py-8 sm:px-10 sm:py-10 mb-6">
        <div className="absolute right-0 top-0 w-56 h-56 rounded-full bg-white/[0.04] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute left-0 bottom-0 w-40 h-40 rounded-full bg-white/[0.03] translate-y-1/3 -translate-x-1/3" />
        {['字', '学', '写'].map((c, i) => (
          <span key={i} className="float-char absolute text-white/[0.06] font-black select-none pointer-events-none"
            style={{ fontSize: `${36 + i * 14}px`, top: `${12 + i * 22}%`, right: `${8 + i * 10}%`, animationDelay: `${i * 0.7}s` }}>
            {c}
          </span>
        ))}

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
              <FileText size={28} className="text-white" strokeWidth={1.8} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-200/70">
                Episode {episode.id} · {episode.title}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">Character Test</h1>
              <p className="text-cyan-200/80 text-sm mt-0.5">Learn characters step by step</p>
            </div>
          </div>
          <div className="flex-shrink-0 text-right hidden sm:block">
            <div className="text-2xl font-extrabold text-white">{progressPct}%</div>
            <div className="text-cyan-200/70 text-xs">{completedCount}/{lessons.length} done</div>
          </div>
        </div>

        <div className="relative z-10 mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-cyan-200/70">Progress</span>
            <span className="text-xs font-bold text-white sm:hidden">{completedCount}/{lessons.length} done</span>
          </div>
          <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Lessons */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl" />
              <div className="flex-1"><div className="h-4 bg-gray-100 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-400 text-sm">No character lessons yet. Admin can add them!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lessons.map((lesson, idx) => {
            const done = !!progress[lesson.id];
            const isFirst = idx === 0;
            const prevDone = idx === 0 || !!progress[lessons[idx - 1].id];
            const locked = !isFirst && !prevDone;
            const wc = wordCounts[lesson.id] || 0;

            return (
              <button
                key={lesson.id}
                onClick={() => { if (!locked) { openLessonSession(`/episode/${id}/activity/character/lesson/${lesson.id}`); navigate(`/episode/${id}/activity/character/lesson/${lesson.id}`); } }}
                disabled={locked}
                className={`w-full group flex items-center gap-4 bg-white border rounded-2xl p-4 text-left transition-all duration-200 ${
                  done
                    ? 'border-green-100 hover:border-green-200 hover:shadow-premium-sm hover:shadow-green-500/5'
                    : locked
                    ? 'border-gray-100 opacity-50 cursor-not-allowed'
                    : 'border-gray-100 hover:border-[#0891b2]/30 hover:shadow-premium-lg hover:shadow-[#0891b2]/8 cursor-pointer'
                }`}
                style={{ animation: `slideIn 0.35s ease-out ${idx * 60}ms both` }}
              >
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? 'bg-green-50' : locked ? 'bg-gray-100' : 'bg-[#0891b2]/10 group-hover:bg-[#0891b2]/15'
                }`}>
                  {done ? <CheckCircle2 size={22} className="text-green-500" />
                    : locked ? <Lock size={18} className="text-gray-400" />
                    : <Play size={18} className="text-[#0891b2] ml-0.5" fill="#0891b2" />}
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-600 flex items-center justify-center shadow-premium-sm">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{lesson.title}</h4>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Sparkles size={11} /> {wc} words to learn
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  {done ? (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Done</span>
                  ) : !locked && (
                    <div className="w-7 h-7 rounded-full bg-[#0891b2] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-premium-blue shadow-[#0891b2]/10">
                      <ChevronLeft size={13} className="text-white rotate-180" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
