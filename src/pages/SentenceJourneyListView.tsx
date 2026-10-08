import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Lock, Play, Sparkles } from 'lucide-react';
import { supabase, type SentenceLesson, type SentenceProgress } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { openLessonSession } from '../lib/usePreventBack';

export default function SentenceJourneyListView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lessons, setLessons] = useState<SentenceLesson[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [{ data: lData }, { data: pData }] = await Promise.all([
        supabase.from('sentence_lessons').select('*').eq('episode_id', Number(id)).order('sort_order'),
        supabase.from('sentence_progress').select('lesson_id').eq('user_id', user.id),
      ]);
      setLessons((lData ?? []) as SentenceLesson[]);
      setCompletedIds(new Set((pData ?? []).map((p: SentenceProgress) => p.lesson_id)));
      setLoading(false);
    }
    load();
  }, [id, user]);

  const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-12">
      <Link
        to={`/episode/${id}`}
        className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-premium-sm rounded-full pl-2.5 pr-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-premium-sm transition-all active:scale-95 mb-5"
      >
        <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <ChevronLeft size={14} className="text-white" strokeWidth={2.5} />
        </span>
        Back to Episode
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 px-6 py-8 mb-6">
        <div className="absolute right-0 top-0 w-56 h-56 rounded-full bg-white/[0.05] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute left-0 bottom-0 w-40 h-40 rounded-full bg-white/[0.04] translate-y-1/3 -translate-x-1/3" />
        {['句', '话', '词', '语'].map((c, i) => (
          <span key={i} className="absolute text-white/[0.06] font-black select-none pointer-events-none"
            style={{ fontSize: `${38 + i * 10}px`, top: `${8 + i * 22}%`, right: `${5 + i * 9}%` }}>
            {c}
          </span>
        ))}
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={26} className="text-white" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/70">Episode {id}</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">Sentence Journey</h1>
              <p className="text-emerald-100/80 text-sm mt-0.5">Build and fill sentences step by step</p>
            </div>
          </div>
          <div className="hidden sm:block flex-shrink-0 text-right">
            <div className="text-2xl font-extrabold text-white">{progressPct}%</div>
            <div className="text-emerald-100/70 text-xs">{completedCount}/{lessons.length} done</div>
          </div>
        </div>
        <div className="relative z-10 mt-5">
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
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <Sparkles size={26} className="text-emerald-400" />
          </div>
          <p className="text-gray-500 font-semibold mb-1">No lessons yet</p>
          <p className="text-gray-400 text-sm">Check back when the instructor adds lessons!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lessons.map((lesson, idx) => {
            const done = completedIds.has(lesson.id);
            const prevDone = idx === 0 || completedIds.has(lessons[idx - 1].id);
            const locked = idx !== 0 && !prevDone;

            return (
              <button
                key={lesson.id}
                onClick={() => { if (!locked) { openLessonSession(`/episode/${id}/activity/sentence/lesson/${lesson.id}`); navigate(`/episode/${id}/activity/sentence/lesson/${lesson.id}`); } }}
                disabled={locked}
                className={`w-full group flex items-center gap-4 bg-white border rounded-2xl p-4 text-left transition-all duration-200 ${
                  done ? 'border-emerald-100 hover:border-emerald-200 hover:shadow-premium-sm'
                    : locked ? 'border-gray-100 opacity-50 cursor-not-allowed'
                    : 'border-gray-100 hover:border-emerald-400/40 hover:shadow-premium-lg hover:shadow-emerald-500/10 cursor-pointer'
                }`}
                style={{ animation: `slideIn 0.35s ease-out ${idx * 60}ms both` }}
              >
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  done ? 'bg-emerald-50' : locked ? 'bg-gray-100' : 'bg-emerald-50 group-hover:bg-emerald-100'
                }`}>
                  {done ? <CheckCircle2 size={22} className="text-emerald-500" />
                    : locked ? <Lock size={18} className="text-gray-400" />
                    : <Play size={18} className="text-emerald-600 ml-0.5" fill="currentColor" />}
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-600 flex items-center justify-center shadow-premium-sm">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{lesson.title}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {done ? 'Completed' : locked ? 'Complete previous lesson to unlock' : 'Tap to start'}
                  </p>
                </div>
                {done && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex-shrink-0">Done</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
