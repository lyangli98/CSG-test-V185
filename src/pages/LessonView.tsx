import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Clock, Award, ChevronRight } from 'lucide-react';
import { supabase, type Lesson } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getEpisodeById } from '../data/episodes';
import VideoPlayer from '../components/VideoPlayer';
import ExitConfirmModal from '../components/ExitConfirmModal';
import { usePreventBack, useNavigateBack, useLessonGuard, openLessonSession, clearActivePath } from '../lib/usePreventBack';

export default function LessonView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const goBack = useNavigateBack();
  useLessonGuard('/welcome');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);

  const hasUnsavedProgress = !!lesson && !isCompleted;
  const { confirmExit, cancelExit } = usePreventBack(hasUnsavedProgress, () => setShowExitModal(true));

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      setLesson(lessonData as Lesson | null);

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', user.id);
      const completedSet = new Set((progressData ?? []).map((p) => p.lesson_id));
      setIsCompleted(!!lessonData && completedSet.has(lessonData.id));

      const { data: allData } = await supabase
        .from('lessons')
        .select('*')
        .eq('episode_id', lessonData?.episode_id ?? 0)
        .order('lesson_number', { ascending: true });
      setAllLessons(allData ?? []);

      setLoading(false);
    }
    loadData();
  }, [id, user]);

  async function handleMarkComplete() {
    if (!user || !lesson || isCompleted || marking) return;
    setMarking(true);
    const { data, error } = await supabase.rpc('record_user_progress', {
      p_lesson_id: lesson.id,
    });
    if (!error && data?.[0]?.success) {
      setIsCompleted(true);
      await refreshProfile();
    }
    setMarking(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-10">
        <div className="h-6 bg-gray-100 rounded w-32 mb-4 animate-pulse" />
        <div className="aspect-video bg-gray-100 rounded-2xl animate-pulse mb-4" />
        <div className="h-6 bg-gray-100 rounded w-1/2 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <p className="text-gray-500 mb-4">Lesson not found</p>
        <Link to="/welcome" onClick={clearActivePath} className="text-[#0891b2] font-semibold hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const episode = getEpisodeById(lesson.episode_id);
  const lessonIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const nextLesson = lessonIndex >= 0 && lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-10">
      <button
        onClick={() => { goBack(`/episode/${lesson.episode_id}`); }}
        className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-premium-sm rounded-full pl-2.5 pr-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-premium-sm transition-all active:scale-95 mb-4"
      >
        <span className="w-6 h-6 rounded-full bg-[#0891b2] flex items-center justify-center">
          <ChevronLeft size={14} className="text-white" strokeWidth={2.5} />
        </span>
        Back to {episode?.title || 'Episode'}
      </button>

      {/* Video player */}
      <VideoPlayer youtubeId={lesson.youtube_id} title={lesson.title} />

      {/* Lesson info */}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          Episode {lesson.episode_id} · Lesson {lesson.lesson_number}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          <Clock size={12} /> {lesson.duration_minutes} min
        </span>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={12} /> Completed
          </span>
        )}
      </div>

      <h1 className="text-2xl font-extrabold text-gray-900 mt-3">{lesson.title}</h1>
      <p className="text-gray-500 mt-1">{lesson.subtitle}</p>

      {/* Complete button */}
      <div className="mt-5 flex flex-wrap gap-3">
        {!isCompleted ? (
          <button
            onClick={handleMarkComplete}
            disabled={marking}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white font-semibold px-5 py-3 rounded-xl shadow-premium-blue shadow-cyan-500/10 hover:shadow-cyan-500/10 transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            {marking ? 'Marking complete...' : 'Mark as Complete'}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 font-semibold px-5 py-3 rounded-xl">
            <Award size={18} />
            +100 points earned!
          </div>
        )}

        {nextLesson && (
          <button
            onClick={() => { openLessonSession(`/lesson/${nextLesson.id}`); navigate(`/lesson/${nextLesson.id}`); }}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-5 py-3 rounded-xl hover:bg-gray-50 transition-all active:scale-95"
          >
            Next Lesson
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Encouragement */}
      {isCompleted && profile && (
        <div className="mt-6 bg-gradient-to-r from-cyan-50 to-cyan-50/50 rounded-2xl border border-cyan-100 p-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Great work, {profile.display_name}! You've completed this lesson and earned 100 points.
            {nextLesson ? ' Keep the momentum going with the next lesson!' : " You've finished all lessons in this episode!"}
          </p>
        </div>
      )}

      <ExitConfirmModal
        open={showExitModal}
        onClose={() => { setShowExitModal(false); cancelExit(); }}
        onConfirm={() => { setShowExitModal(false); confirmExit(); }}
        accent="cyan"
      />
    </div>
  );
}
