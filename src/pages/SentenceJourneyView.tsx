import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  X, Volume2, Check, Trophy, Star, ArrowRight,
  Sparkles, MessageCircle, RotateCcw,
} from 'lucide-react';
import { supabase, type SentenceLesson, type SentenceQuestion, type WordTile } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ExitConfirmModal from '../components/ExitConfirmModal';
import { usePreventBack, useNavigateBack, useLessonGuard } from '../lib/usePreventBack';

// ── Audio helpers ──────────────────────────────────────────────
function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
}

// ── Types ───────────────────────────────────────────────────────
type FillBlankStage = 'preview' | 'exercise';
type DialogueStage = 'speaker_a' | 'speaker_b' | 'revealed';
type FeedbackState = 'idle' | 'correct' | 'wrong';

// ── Main Component ──────────────────────────────────────────────
export default function SentenceJourneyView() {
  const { id, lessonId } = useParams();
  useAuth();
  const goBack = useNavigateBack();
  useLessonGuard(`/episode/${id}/activity/sentence`);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [lesson, setLesson] = useState<SentenceLesson | null>(null);
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [qIdx, setQIdx] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string[]>>({});

  const hasUnsavedProgress = !!lesson && questions.length > 0 && !showAchievement;
  const { confirmExit, cancelExit } = usePreventBack(hasUnsavedProgress, () => setShowExitModal(true));

  // fill_blank state
  const [fbStage, setFbStage] = useState<FillBlankStage>('preview');
  const [blankFill, setBlankFill] = useState<(number | null)[]>([]);
  const [fbFeedback, setFbFeedback] = useState<FeedbackState>('idle');
  const [fbShake, setFbShake] = useState(false);

  // dialogue state
  const [dlStage, setDlStage] = useState<DialogueStage>('speaker_a');
  const [dlBlankFill, setDlBlankFill] = useState<(number | null)[]>([]);
  const [dlFeedback, setDlFeedback] = useState<FeedbackState>('idle');
  const [dlShake, setDlShake] = useState(false);

  const playAudio = useCallback((url: string | null | undefined) => {
    if (!url) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch((e) => console.warn('Audio play failed:', url, e));
    } catch (e) { console.warn('Audio error:', e); }
  }, []);

  useEffect(() => {
    async function load() {
      if (!lessonId) return;
      const { data: lData } = await supabase
        .from('sentence_lessons').select('*').eq('id', lessonId).maybeSingle();
      const { data: qData } = await supabase.rpc('get_student_sentence_questions', {
        p_lesson_id: lessonId,
      });
      if (!lData) { setLoading(false); return; }
      setLesson(lData as SentenceLesson);
      setQuestions((qData ?? []) as SentenceQuestion[]);
      setLoading(false);
    }
    load();
  }, [lessonId]);

  // Reset per-question state when question changes
  useEffect(() => {
    const q = questions[qIdx];
    if (!q) return;
    if (q.question_type === 'fill_blank') {
      const hasPreview = !!(q.preview_chinese || q.preview_audio_url || (q.word_tiles ?? []).length > 0);
      setFbStage(hasPreview ? 'preview' : 'exercise');
      const blankCount = (q.slot_config ?? []).filter((s) => !s.prefilled).length;
      setBlankFill(Array(blankCount).fill(null));
      setFbFeedback('idle');
      setFbShake(false);
    } else {
      setDlStage('speaker_a');
      const blankCount = q.speaker_b_answer_count ?? 0;
      setDlBlankFill(Array(blankCount).fill(null));
      setDlFeedback('idle');
      setDlShake(false);
    }
  }, [qIdx, questions]);

  function completeLesson() {
    playSuccessSound();
    setTimeout(() => setShowAchievement(true), 500);
  }

  async function submitAnswer(questionId: string, answers: string[]) {
    if (!lessonId) return false;
    const nextSubmissions = { ...submittedAnswers, [questionId]: answers };
    const submissions = Object.entries(nextSubmissions).map(([id, submitted]) => ({
      question_id: id,
      answers: submitted,
    }));
    const { data, error } = await supabase.rpc('submit_sentence_answer', {
      p_lesson_id: lessonId,
      p_question_id: questionId,
      p_answers: answers,
      p_submissions: submissions,
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result?.is_correct) return false;
    setSubmittedAnswers(nextSubmissions);
    return true;
  }

  function goNextQuestion() {
    if (qIdx + 1 >= questions.length) {
      completeLesson();
    } else {
      setQIdx((i) => i + 1);
    }
  }

  // ── Fill Blank Helpers ──────────────────────────────────────
  const currentQ = questions[qIdx];

  function fbTileTap(tiles: WordTile[], tileIdx: number) {
    playAudio(tiles[tileIdx]?.audio_url);
    if (fbFeedback !== 'idle') return;
    const firstEmpty = blankFill.indexOf(null);
    if (firstEmpty === -1) return;
    if (blankFill.includes(tileIdx)) return;
    const next = [...blankFill];
    next[firstEmpty] = tileIdx;
    setBlankFill(next);
  }

  function fbBlankTap(blankIdx: number) {
    if (fbFeedback !== 'idle') return;
    if (blankFill[blankIdx] === null) return;
    const next = [...blankFill];
    next[blankIdx] = null;
    setBlankFill(next);
  }

  async function fbCheck() {
    if (!currentQ) return;
    const tiles = currentQ.word_tiles ?? [];
    const filled = blankFill.map((ti) => (ti !== null ? tiles[ti]?.chinese ?? '' : ''));
    const isCorrect = await submitAnswer(currentQ.id, filled);
    if (isCorrect) {
      setFbFeedback('correct');
      playAudio(currentQ.sentence_audio_url);
      setTimeout(() => { setFbFeedback('idle'); goNextQuestion(); }, 1600);
    } else {
      setFbFeedback('wrong');
      setFbShake(true);
      playErrorSound();
      setTimeout(() => { setFbFeedback('idle'); setFbShake(false); }, 900);
    }
  }

  function fbReset() {
    const blanks = (currentQ?.slot_config ?? []).filter((s) => !s.prefilled).length;
    setBlankFill(Array(blanks).fill(null));
    setFbFeedback('idle');
  }

  // ── Dialogue Helpers ────────────────────────────────────────
  function dlTileTap(tiles: WordTile[], tileIdx: number) {
    playAudio(tiles[tileIdx]?.audio_url);
    if (dlFeedback !== 'idle') return;
    if (dlBlankFill.includes(tileIdx)) return;
    const firstEmpty = dlBlankFill.indexOf(null);
    if (firstEmpty === -1) return;
    const next = [...dlBlankFill];
    next[firstEmpty] = tileIdx;
    setDlBlankFill(next);
  }

  function dlBlankTap(blankIdx: number) {
    if (dlFeedback !== 'idle') return;
    if (dlBlankFill[blankIdx] === null) return;
    const next = [...dlBlankFill];
    next[blankIdx] = null;
    setDlBlankFill(next);
  }

  async function dlCheck() {
    if (!currentQ) return;
    const tiles = currentQ.dialogue_word_tiles ?? [];
    const filled = dlBlankFill.map((ti) => (ti !== null ? tiles[ti]?.chinese ?? '' : ''));
    const isCorrect = await submitAnswer(currentQ.id, filled);
    if (isCorrect) {
      setDlFeedback('correct');
      setDlStage('revealed');
      playAudio(currentQ.speaker_b_audio_url);
      setTimeout(() => { setDlFeedback('idle'); goNextQuestion(); }, 2200);
    } else {
      setDlFeedback('wrong');
      setDlShake(true);
      playErrorSound();
      setTimeout(() => { setDlFeedback('idle'); setDlShake(false); }, 900);
    }
  }

  function dlReset() {
    setDlBlankFill(Array(currentQ?.speaker_b_answer_count ?? 0).fill(null));
    setDlFeedback('idle');
  }

  // ── Loading / Not Found ─────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading your journey...</p>
      </div>
    );
  }

  if (!lesson || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Lesson not found or has no questions.</p>
        <button onClick={() => { goBack(`/episode/${id}/activity/sentence`); }} className="text-emerald-600 font-semibold">Back to Lessons</button>
      </div>
    );
  }

  const progressPct = Math.round(((qIdx) / questions.length) * 100);

  return (
    <div className="h-[100dvh] max-w-2xl mx-auto px-4 sm:px-6 flex flex-col overflow-hidden">
      {/* Header: X + question indicator + progress dots + bar */}
      <div className="pt-3 pb-2.5">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => { goBack(`/episode/${id}/activity/sentence`); }}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            aria-label="Close lesson"
          >
            <X size={18} className="text-gray-600" strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 flex-shrink-0">
              {qIdx + 1}/{questions.length}
            </span>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {questions.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                  i < qIdx ? 'w-2 bg-emerald-500' : i === qIdx ? 'w-6 bg-emerald-400' : 'w-2 bg-gray-200'
                }`} />
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Lesson content — fills remaining viewport */}
      <div className="flex-1 overflow-y-auto py-3">

      {/* ─── Question renderer ─── */}
      <div className="space-y-4">
      {currentQ?.question_type === 'fill_blank' && (
        <FillBlankQuestion
          q={currentQ}
          stage={fbStage}
          blankFill={blankFill}
          feedback={fbFeedback}
          shake={fbShake}
          onContinue={() => setFbStage('exercise')}
          onTileTap={(i) => fbTileTap(currentQ.word_tiles ?? [], i)}
          onBlankTap={fbBlankTap}
          onCheck={fbCheck}
          onReset={fbReset}
          onPlayAudio={playAudio}
        />
      )}

      {currentQ?.question_type === 'dialogue' && (
        <DialogueQuestion
          q={currentQ}
          stage={dlStage}
          blankFill={dlBlankFill}
          feedback={dlFeedback}
          shake={dlShake}
          onStartResponse={() => setDlStage('speaker_b')}
          onTileTap={(i) => dlTileTap(currentQ.dialogue_word_tiles ?? [], i)}
          onBlankTap={dlBlankTap}
          onCheck={dlCheck}
          onReset={dlReset}
          onPlayAudio={playAudio}
        />
      )}
      </div>
      </div>

      {/* ─── Achievement Popup ─── */}
      {showAchievement && (
        <AchievementPopup
          questionCount={questions.length}
          onContinue={() => { goBack(`/episode/${id}/activity/sentence`); }}
        />
      )}

      <ExitConfirmModal
        open={showExitModal}
        onClose={() => { setShowExitModal(false); cancelExit(); }}
        onConfirm={() => { setShowExitModal(false); confirmExit(); }}
        accent="emerald"
      />
    </div>
  );
}

// ── Fill Blank Question ─────────────────────────────────────────
interface FillBlankProps {
  q: SentenceQuestion;
  stage: FillBlankStage;
  blankFill: (number | null)[];
  feedback: FeedbackState;
  shake: boolean;
  onContinue: () => void;
  onTileTap: (idx: number) => void;
  onBlankTap: (idx: number) => void;
  onCheck: () => void;
  onReset: () => void;
  onPlayAudio: (url: string | null | undefined) => void;
}

function FillBlankQuestion({ q, stage, blankFill, feedback, shake, onContinue, onTileTap, onBlankTap, onCheck, onReset, onPlayAudio }: FillBlankProps) {
  const tiles = q.word_tiles ?? [];
  const slots = q.slot_config ?? [];
  const usedTileIndices = new Set(blankFill.filter((v): v is number => v !== null));
  const allFilled = blankFill.every((v) => v !== null) && blankFill.length > 0;

  if (stage === 'preview') {
    return (
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden" style={{ animation: 'panelIn 0.4s ease-out both' }}>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-2.5 flex items-center gap-2">
          <Sparkles size={16} className="text-white" />
          <span className="text-white font-bold text-sm">New Word</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
          {q.preview_chinese && (
            <>
              <p className="text-4xl font-black text-gray-900 mb-1 tracking-wide">{q.preview_chinese}</p>
              {q.preview_pinyin && (
                <p className="text-lg text-emerald-600 font-semibold">{q.preview_pinyin}</p>
              )}
              {q.preview_meaning && (
                <p className="text-sm text-gray-400 mb-4">{q.preview_meaning}</p>
              )}
            </>
          )}

          {/* Word tiles preview */}
          {tiles.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 font-medium mb-2">Words in this exercise:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {tiles.map((t, i) => (
                  <button key={i} onClick={() => onPlayAudio(t.audio_url)}
                    className="flex flex-col items-center bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1.5 hover:bg-emerald-50 hover:border-emerald-200 transition active:scale-95">
                    <span className="text-xs text-gray-400">{t.pinyin}</span>
                    <span className="text-lg font-bold text-gray-900">{t.chinese}</span>
                    {t.meaning && <span className="text-[10px] text-gray-400 mt-0.5">{t.meaning}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q.preview_audio_url && (
            <button onClick={() => onPlayAudio(q.preview_audio_url)}
              className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-premium-emerald shadow-emerald-500/10 hover:scale-110 active:scale-95 transition-all">
              <Volume2 size={22} className="text-white" />
            </button>
          )}
        </div>
        <div className="p-4 pt-0">
          <button onClick={onContinue}
            className="w-full bg-emerald-500 text-white font-bold py-3 rounded-2xl shadow-premium-emerald shadow-emerald-500/10 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2">
            Continue <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Exercise stage
  let blankCount = 0;
  return (
    <div className="flex-1 flex flex-col gap-3" style={{ animation: 'panelIn 0.4s ease-out both' }}>
      {/* Sentence meaning + audio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium-sm p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => onPlayAudio(q.sentence_audio_url)}
            className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 hover:bg-emerald-200 active:scale-95 transition-all mt-0.5">
            <Volume2 size={16} className="text-emerald-600" />
          </button>
          <p className="text-gray-700 font-semibold text-sm leading-relaxed">{q.sentence_meaning || 'Fill in the blanks'}</p>
        </div>
      </div>

      {/* Slots */}
      <div className={`bg-white rounded-2xl border-2 shadow-premium-sm p-4 transition-all ${
        feedback === 'correct' ? 'border-emerald-400 bg-emerald-50/30'
          : feedback === 'wrong' ? 'border-red-400 bg-red-50/20'
          : 'border-gray-100'
      } ${shake ? 'animate-[shake_0.4s_ease-out]' : ''}`}>
        <div className="flex flex-wrap items-center gap-2 justify-center min-h-[48px]">
          {slots.map((slot, i) => {
            if (slot.prefilled) {
              return (
                <span key={i} className="px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 font-bold text-lg">
                  {slot.text}
                </span>
              );
            }
            const myBlankIdx = blankCount++;
            const tileIdx = blankFill[myBlankIdx];
            const tile = tileIdx !== null ? (q.word_tiles ?? [])[tileIdx!] : null;
            return (
              <button key={i} onClick={() => onBlankTap(myBlankIdx)}
                className={`min-w-[48px] h-11 px-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                  tile
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold hover:border-red-300 hover:bg-red-50/20'
                    : 'border-gray-300 bg-gray-50 hover:border-emerald-300'
                }`}>
                {tile ? (
                  <>
                    <span className="text-[9px] text-emerald-500">{tile.pinyin}</span>
                    <span className="text-base font-bold leading-tight">{tile.chinese}</span>
                  </>
                ) : (
                  <span className="text-gray-300 text-sm">＿</span>
                )}
              </button>
            );
          })}
        </div>

        {feedback === 'correct' && (
          <p className="text-center text-emerald-600 font-bold text-sm mt-2" style={{ animation: 'slideIn 0.3s ease-out both' }}>
            Correct!
          </p>
        )}
        {feedback === 'wrong' && (
          <p className="text-center text-red-500 font-bold text-sm mt-2">
            Not quite — try again!
          </p>
        )}
      </div>

      {/* Word tiles */}
      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Choose words</p>
        <div className="flex flex-wrap gap-2">
          {tiles.map((t, i) => {
            const used = usedTileIndices.has(i);
            return (
              <button key={i} onClick={() => !used && onTileTap(i)} disabled={used}
                className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border-2 transition-all active:scale-95 ${
                  used
                    ? 'border-gray-100 bg-gray-50 opacity-30 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-premium-sm shadow-premium-sm cursor-pointer'
                }`}>
                {t.pinyin && <span className="text-[9px] text-gray-400">{t.pinyin}</span>}
                <span className="text-base font-bold text-gray-900">{t.chinese}</span>
                {t.meaning && <span className="text-[9px] text-gray-400">{t.meaning}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button onClick={onReset}
          className="w-10 h-11 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-200 transition flex-shrink-0">
          <RotateCcw size={16} />
        </button>
        <button onClick={onCheck} disabled={!allFilled || feedback !== 'idle'}
          className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all ${
            allFilled && feedback === 'idle'
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-premium-emerald shadow-emerald-500/10 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}>
          Check Answer
        </button>
      </div>
    </div>
  );
}

// ── Dialogue Question ───────────────────────────────────────────
interface DialogueProps {
  q: SentenceQuestion;
  stage: DialogueStage;
  blankFill: (number | null)[];
  feedback: FeedbackState;
  shake: boolean;
  onStartResponse: () => void;
  onTileTap: (idx: number) => void;
  onBlankTap: (idx: number) => void;
  onCheck: () => void;
  onReset: () => void;
  onPlayAudio: (url: string | null | undefined) => void;
}

function DialogueQuestion({ q, stage, blankFill, feedback, shake, onStartResponse, onTileTap, onBlankTap, onCheck, onReset, onPlayAudio }: DialogueProps) {
  const tiles = q.dialogue_word_tiles ?? [];
  const usedTileIndices = new Set(blankFill.filter((v): v is number => v !== null));
  const allFilled = blankFill.every((v) => v !== null) && blankFill.length > 0;

  // Auto-play speaker A audio when question mounts
  const hasAutoPlayed = useRef(false);
  useEffect(() => {
    if (!hasAutoPlayed.current && q.speaker_a_audio_url) {
      hasAutoPlayed.current = true;
      setTimeout(() => onPlayAudio(q.speaker_a_audio_url), 400);
    }
  }, [q.id]);

  return (
    <div className="flex-1 flex flex-col gap-3" style={{ animation: 'panelIn 0.4s ease-out both' }}>
      {/* Dialogue header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={14} className="text-cyan-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dialogue Practice</span>
        </div>

        {/* Speaker A bubble */}
        <div className="flex items-start gap-3 mb-3" style={{ animation: 'slideIn 0.4s ease-out both' }}>
          <div className="w-9 h-9 rounded-full bg-cyan-100 border-2 border-cyan-200 flex items-center justify-center text-lg flex-shrink-0">
            {q.speaker_a_avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-cyan-500 mb-1">{q.speaker_a_name}</p>
            <div className="bg-cyan-50 rounded-2xl rounded-tl-sm p-3 border border-cyan-100">
              {q.speaker_a_meaning && (
                <p className="text-xs text-cyan-400 mb-1 font-medium">{q.speaker_a_meaning}</p>
              )}
              {q.speaker_a_chinese && (
                <div className="flex items-center gap-2">
                  <button onClick={() => onPlayAudio(q.speaker_a_audio_url)}
                    className="w-7 h-7 rounded-full bg-cyan-200 flex items-center justify-center flex-shrink-0 hover:bg-cyan-300 active:scale-95 transition">
                    <Volume2 size={13} className="text-cyan-600" />
                  </button>
                  <p className="text-base font-bold text-gray-800">{q.speaker_a_chinese}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Speaker B area */}
        {(stage === 'speaker_a') && (
          <button onClick={onStartResponse}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-premium-emerald shadow-emerald-500/10 hover:bg-emerald-600 active:scale-[0.98] transition-all"
            style={{ animation: 'slideIn 0.4s ease-out 0.3s both' }}>
            Your Turn <ArrowRight size={16} />
          </button>
        )}

        {(stage === 'speaker_b' || stage === 'revealed') && (
          <div className="flex items-start gap-3" style={{ animation: 'slideIn 0.4s ease-out both' }}>
            <div className="flex-1 min-w-0 order-first">
              <p className="text-[11px] font-bold text-emerald-600 mb-1 text-right">{q.speaker_b_name}</p>
              {q.speaker_b_prompt && stage === 'speaker_b' && (
                <p className="text-xs text-gray-400 text-right mb-2">{q.speaker_b_prompt}</p>
              )}

              {stage === 'revealed' ? (
                <div className="bg-emerald-50 rounded-2xl rounded-tr-sm p-3 border border-emerald-200 flex items-center gap-2 justify-end">
                  <button onClick={() => onPlayAudio(q.speaker_b_audio_url)}
                    className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0 hover:bg-emerald-300 active:scale-95 transition">
                    <Volume2 size={13} className="text-emerald-700" />
                  </button>
                  <p className="text-base font-bold text-gray-800">
                    {blankFill.map((ti) => (ti !== null ? tiles[ti]?.chinese ?? '' : '')).join('')}
                  </p>
                  <Check size={16} className="text-emerald-500 flex-shrink-0" />
                </div>
              ) : (
                <div className={`bg-emerald-50 rounded-2xl rounded-tr-sm p-3 border-2 border-dashed flex flex-wrap gap-2 justify-end min-h-[48px] transition-all ${
                  feedback === 'wrong' ? 'border-red-400 bg-red-50/30' : 'border-emerald-200'
                } ${shake ? 'animate-[shake_0.4s_ease-out]' : ''}`}>
                  {blankFill.map((ti, i) => {
                    const tile = ti !== null ? tiles[ti] : null;
                    return (
                      <button key={i} onClick={() => onBlankTap(i)}
                        className={`min-w-[44px] h-10 px-2.5 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                          tile
                            ? 'border-emerald-400 bg-white text-emerald-800 font-bold hover:border-red-300 hover:bg-red-50/20'
                            : 'border-emerald-200 bg-white/50'
                        }`}>
                        {tile ? (
                          <>
                            <span className="text-[9px] text-emerald-500 leading-none">{tile.pinyin}</span>
                            <span className="text-sm font-bold leading-tight">{tile.chinese}</span>
                          </>
                        ) : (
                          <span className="text-gray-300 text-sm">＿</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {feedback === 'wrong' && stage !== 'revealed' && (
                <p className="text-red-500 text-xs font-semibold text-right mt-1">Not quite — try again!</p>
              )}
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-lg flex-shrink-0">
              {q.speaker_b_avatar}
            </div>
          </div>
        )}
      </div>

      {/* Word tiles */}
      {(stage === 'speaker_b') && (
        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100" style={{ animation: 'slideIn 0.3s ease-out 0.15s both' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Choose words</p>
          <div className="flex flex-wrap gap-2">
            {tiles.map((t, i) => {
              const used = usedTileIndices.has(i);
              return (
                <button key={i} onClick={() => !used && onTileTap(i)} disabled={used}
                  className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border-2 transition-all active:scale-95 ${
                    used
                      ? 'border-gray-100 bg-gray-50 opacity-30 cursor-not-allowed'
                      : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-premium-sm shadow-premium-sm cursor-pointer'
                  }`}>
                  {t.pinyin && <span className="text-[9px] text-gray-400">{t.pinyin}</span>}
                  <span className="text-base font-bold text-gray-900">{t.chinese}</span>
                  {t.meaning && <span className="text-[9px] text-gray-400">{t.meaning}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Check actions */}
      {stage === 'speaker_b' && (
        <div className="flex gap-2 mt-auto">
          <button onClick={onReset}
            className="w-10 h-11 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-200 transition flex-shrink-0">
            <RotateCcw size={16} />
          </button>
          <button onClick={onCheck} disabled={!allFilled || feedback !== 'idle'}
            className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all ${
              allFilled && feedback === 'idle'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-premium-emerald shadow-emerald-500/10 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}>
            Check Answer
          </button>
        </div>
      )}
    </div>
  );
}

// ── Achievement Popup ───────────────────────────────────────────
function AchievementPopup({ questionCount, onContinue }: { questionCount: number; onContinue: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      style={{ animation: 'fadeIn 0.3s ease-out both' }}>
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-premium-lg relative overflow-hidden"
        style={{ animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>

        {/* Confetti dots */}
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full opacity-0"
            style={{
              background: ['#10b981','#0ea5e9','#f59e0b','#ef4444','#8b5cf6'][i % 5],
              top: `${10 + (i % 4) * 20}%`,
              left: `${5 + i * 8}%`,
              animation: `confetti 1s ease-out ${i * 0.08}s both`,
            }} />
        ))}

        {/* Trophy */}
        <div className="relative mx-auto w-24 h-24 mb-5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-xl opacity-50"
            style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-premium-lg">
            <Trophy size={48} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Journey Complete!</h2>
        <p className="text-sm text-gray-400 mb-5">You finished all {questionCount} questions</p>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <Star key={i} size={32} className="text-amber-400 fill-amber-400"
              style={{ animation: `popIn 0.4s ease-out ${0.2 + i * 0.15}s both` }} />
          ))}
        </div>

        <button onClick={onContinue}
          className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-2xl shadow-premium-emerald shadow-emerald-500/10 hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2">
          Continue <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
