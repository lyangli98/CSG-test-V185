import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Volume2, Check, X, Sparkles, Star, Trophy,
  ArrowRight,
} from 'lucide-react';
import { supabase, type CharWord, type CharLesson } from '../lib/supabase';
import ExitConfirmModal from '../components/ExitConfirmModal';
import { usePreventBack, useNavigateBack, useLessonGuard } from '../lib/usePreventBack';

type Stage = 'learn' | 'wordtest' | 'sentence' | 'complete';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
}

export default function CharacterLessonView() {
  const { id, lessonId } = useParams();
  const goBack = useNavigateBack();
  useLessonGuard(`/episode/${id}/activity/character`);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [lesson, setLesson] = useState<CharLesson | null>(null);
  const [allWords, setAllWords] = useState<CharWord[]>([]);
  const [words, setWords] = useState<CharWord[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-tracked session
  const sessionIdRef = useRef<string | null>(null);

  // Flow state
  const [wordIdx, setWordIdx] = useState(0);
  const [stage, setStage] = useState<Stage>('learn');
  const [listenCount, setListenCount] = useState(0);
  const [sentenceListenCount, setSentenceListenCount] = useState(0);
  const [showCard, setShowCard] = useState(true);
  const [options, setOptions] = useState<CharWord[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Per-word round tracking
  const currentRoundIdRef = useRef<string | null>(null);
  const wordCorrectRef = useRef<{ wordtest: number; sentence: number }>({ wordtest: 0, sentence: 0 });

  const hasUnsavedProgress = !!lesson && words.length > 0 && stage !== 'complete';
  const { confirmExit, cancelExit } = usePreventBack(hasUnsavedProgress, () => setShowExitModal(true));

  const currentWord = words[wordIdx];

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

  const playAudioWithEnd = useCallback((url: string | null | undefined, onEnded?: () => void) => {
    if (!url) { onEnded?.(); return; }
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { onEnded?.(); };
      audio.play().catch((e) => console.warn('Audio play failed:', url, e));
    } catch (e) { console.warn('Audio error:', e); }
  }, []);

  useEffect(() => {
    async function load() {
      if (!lessonId) return;
      const { data: lessonData } = await supabase
        .from('char_lessons').select('*').eq('id', lessonId).maybeSingle();
      if (!lessonData) { setLoading(false); return; }
      setLesson(lessonData as CharLesson);

      // Start server-tracked quiz session
      const { data: sessionData, error } = await supabase.rpc('start_char_quiz', { p_lesson_id: lessonId });
      const session = Array.isArray(sessionData) ? sessionData[0] : sessionData;
      if (error || !session?.session_id) { setLoading(false); return; }
      sessionIdRef.current = session.session_id;

      // Parse words from the server response
      const sessionWords: CharWord[] = (session.words as any[]).map((w) => ({
        id: w.id,
        lesson_id: w.lesson_id,
        chinese: w.chinese,
        pinyin: w.pinyin,
        meaning: w.meaning,
        image_url: w.image_url,
        audio_url: w.audio_url,
        sentence_hanzi: w.sentence_hanzi,
        sentence_pinyin: w.sentence_pinyin,
        sentence_meaning: w.sentence_meaning,
        sentence_audio_url: w.sentence_audio_url,
        sort_order: w.sort_order,
        created_at: w.created_at,
      }));

      // Also load all words for display purposes (sentence rendering etc.)
      const { data: wordData } = await supabase
        .from('char_words').select('*').eq('lesson_id', lessonId).order('sort_order', { ascending: true });
      setAllWords((wordData ?? []) as CharWord[]);
      setWords(sessionWords);
      setLoading(false);
    }
    load();
  }, [lessonId]);

  // Fetch a round from the server: target word + 3 shuffled options
  const fetchRound = useCallback(async (wordId: string, roundStage: 'wordtest' | 'sentence') => {
    if (!sessionIdRef.current) return;
    const { data, error } = await supabase.rpc('get_char_round', {
      p_session_id: sessionIdRef.current,
      p_word_id: wordId,
      p_stage: roundStage,
    });
    const round = Array.isArray(data) ? data[0] : data;
    if (error || !round?.round_id) return;
    currentRoundIdRef.current = round.round_id;
    const optIds: string[] = (Array.isArray(round.option_ids) ? round.option_ids : [])
      .map((option: unknown) => {
        if (typeof option === 'string') return option;
        if (option && typeof option === 'object' && 'value' in option && typeof option.value === 'string') {
          return option.value;
        }
        return null;
      })
      .filter((optionId: string | null): optionId is string => optionId !== null);
    const optWords = optIds
      .map((oid) => allWords.find((w) => w.id === oid))
      .filter((w): w is CharWord => !!w);
    setOptions(shuffle(optWords));
  }, [allWords]);

  // ── Stage transitions ──
  function handleListen() {
    if (!currentWord?.audio_url) return;
    playAudioWithEnd(currentWord.audio_url, () => {
      setListenCount((n) => n + 1);
    });
  }

  function handleLearnNext() {
    setStage('wordtest');
    setShowCard(true);
    setCorrectCount(0);
    setAttempts(0);
    setSelected(null);
    setFeedback(null);
    wordCorrectRef.current = { wordtest: 0, sentence: 0 };
    if (currentWord) fetchRound(currentWord.id, 'wordtest');
  }

  function handleWordTestReady() {
    setShowCard(false);
    setSelected(null);
    setFeedback(null);
  }

  async function handleWordChoice(word: CharWord) {
    if (feedback) return;
    setSelected(word.id);

    const isCorrect = word.id === currentWord.id;

    if (currentRoundIdRef.current) {
      supabase.rpc('submit_char_round', {
        p_round_id: currentRoundIdRef.current,
        p_selected_word_id: word.id,
      }).then(({ data }) => {
        const result = Array.isArray(data) ? data[0] : data;
        if (result) wordCorrectRef.current.wordtest = result.wordtest_correct ?? (isCorrect ? correctCount + 1 : correctCount);
      }).catch(() => {});
    }

    if (isCorrect) {
      setFeedback('correct');
      playAudio(currentWord.audio_url);
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      setAttempts(attempts + 1);

      setTimeout(() => {
        if (newCorrect >= 3) {
          setStage('sentence');
          setShowCard(true);
          setCorrectCount(0);
          setAttempts(0);
          setSelected(null);
          setFeedback(null);
          setSentenceListenCount(0);
          wordCorrectRef.current = { wordtest: 3, sentence: 0 };
          if (currentWord) fetchRound(currentWord.id, 'sentence');
        } else {
          if (currentWord) fetchRound(currentWord.id, 'wordtest');
          setSelected(null);
          setFeedback(null);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      playErrorSound();
      setAttempts(attempts + 1);
      setTimeout(() => {
        if (currentWord) fetchRound(currentWord.id, 'wordtest');
        setSelected(null);
        setFeedback(null);
      }, 900);
    }
  }

  function handleSentenceListen() {
    if (currentWord?.sentence_audio_url) {
      playAudioWithEnd(currentWord.sentence_audio_url, () => {
        setSentenceListenCount((n) => n + 1);
      });
    }
  }

  function handleSentenceReady() {
    setShowCard(false);
    setSelected(null);
    setFeedback(null);
  }

  async function handleSentenceChoice(word: CharWord) {
    if (feedback) return;
    setSelected(word.id);

    const isCorrect = word.id === currentWord.id;

    if (currentRoundIdRef.current) {
      supabase.rpc('submit_char_round', {
        p_round_id: currentRoundIdRef.current,
        p_selected_word_id: word.id,
      }).then(({ data }) => {
        const result = Array.isArray(data) ? data[0] : data;
        if (result) wordCorrectRef.current.sentence = result.sentence_correct ?? (isCorrect ? correctCount + 1 : correctCount);
      }).catch(() => {});
    }

    if (isCorrect) {
      setFeedback('correct');
      playAudio(currentWord.audio_url);
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      setAttempts(attempts + 1);

      setTimeout(() => {
        if (newCorrect >= 3) {
          if (wordIdx + 1 >= words.length) {
            completeLesson();
          } else {
            setWordIdx(wordIdx + 1);
            setStage('learn');
            setShowCard(true);
            setListenCount(0);
            setSentenceListenCount(0);
            setCorrectCount(0);
            setAttempts(0);
            setSelected(null);
            setFeedback(null);
            wordCorrectRef.current = { wordtest: 0, sentence: 0 };
          }
        } else {
          if (currentWord) fetchRound(currentWord.id, 'sentence');
          setSelected(null);
          setFeedback(null);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      playErrorSound();
      setAttempts(attempts + 1);
      setTimeout(() => {
        if (currentWord) fetchRound(currentWord.id, 'sentence');
        setSelected(null);
        setFeedback(null);
      }, 900);
    }
  }

  async function completeLesson() {
    setStage('complete');
    playSuccessSound();
    setTimeout(() => setShowAchievement(true), 600);

    if (sessionIdRef.current) {
      supabase.rpc('complete_char_quiz', {
        p_session_id: sessionIdRef.current,
      }).catch(() => {});
    }
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-12 h-12 border-4 border-[#0891b2]/20 border-t-[#0891b2] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading lesson...</p>
      </div>
    );
  }

  if (!lesson || words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 mb-4">Lesson not found or has no words.</p>
        <button onClick={() => { goBack(`/episode/${id}/activity/character`); }} className="text-[#0891b2] font-semibold">Back to Lessons</button>
      </div>
    );
  }

  const totalSteps = words.length * 3;
  const currentStep = wordIdx * 3 + (stage === 'learn' ? 0 : stage === 'wordtest' ? 1 : stage === 'sentence' ? 2 : 3);
  const progressPct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="h-[100dvh] max-w-[800px] mx-auto px-4 sm:px-6 flex flex-col overflow-hidden">
      <div className="pt-2 pb-1.5">
        <div className="flex items-center gap-3 mb-1.5">
          <button
            onClick={() => { goBack(`/episode/${id}/activity/character`); }}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            aria-label="Close lesson"
          >
            <X size={18} className="text-gray-600" strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#0891b2] flex-shrink-0">
              Word {wordIdx + 1}/{words.length}
            </span>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {words.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-300 flex-shrink-0 ${i < wordIdx ? 'w-2 bg-green-500' : i === wordIdx ? 'w-6 bg-[#0891b2]' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#0891b2] to-[#155e75] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col py-3">

      {/* ─────────── STAGE: LEARN ─────────── */}
      {stage === 'learn' && currentWord && (
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden" style={{ animation: 'panelIn 0.4s ease-out both' }}>
          <div className="bg-gradient-to-br from-[#0891b2] to-[#155e75] px-5 py-2.5 flex items-center gap-2">
            <Sparkles size={16} className="text-white" />
            <span className="text-white font-bold text-sm">Step 1: Learn the Word</span>
          </div>
          {currentWord.image_url && (
            <div className="w-full aspect-video overflow-hidden bg-[#155e75]">
              <img
                src={currentWord.image_url}
                alt={currentWord.meaning}
                className="w-full h-full object-cover object-center"
              />
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-start p-4 pt-6">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-1 tracking-wide">{currentWord.chinese}</p>
              <p className="text-sm text-[#0891b2] font-semibold">{currentWord.pinyin}</p>
              <p className="text-xs text-gray-400">{currentWord.meaning}</p>
            </div>

            <div className="flex flex-col items-center gap-2 mt-3">
              <button
                onClick={handleListen}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0891b2] to-[#155e75] flex items-center justify-center shadow-premium-lg shadow-[#0891b2]/10 hover:scale-110 active:scale-95 transition-all"
              >
                <Volume2 size={24} className="text-white" />
              </button>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < listenCount ? 'bg-green-500 scale-110' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-[11px] text-gray-400 font-medium text-center">
                {listenCount === 0 ? 'Tap to listen (3 times)' : listenCount < 3 ? `Listen ${3 - listenCount} more time${3 - listenCount > 1 ? 's' : ''}` : 'Great! You can continue'}
              </p>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              onClick={handleLearnNext}
              disabled={listenCount < 3}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-2xl transition-all ${
                listenCount >= 3
                  ? 'bg-[#0891b2] text-white shadow-premium-blue shadow-[#0891b2]/10 hover:bg-[#0e7490] active:scale-95'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              Continue to Test <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ─────────── STAGE: WORD TEST ─────────── */}
      {stage === 'wordtest' && currentWord && (
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden" style={{ animation: 'panelIn 0.4s ease-out both' }}>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 px-5 py-2.5 flex items-center gap-2">
            <Check size={16} className="text-white" />
            <span className="text-white font-bold text-sm">Step 2: Choose the Correct Word</span>
          </div>

          <div className="flex-1 flex flex-col justify-start p-5 pt-6">
            {showCard ? (
              <div className="text-center mt-[125px]">
                <p className="text-xs text-gray-400 mb-3">Remember this word:</p>
                <div className="inline-flex flex-col items-center bg-cyan-50 rounded-2xl px-7 py-4 border border-cyan-100">
                  <p className="text-3xl font-black text-gray-900 mb-0.5">{currentWord.chinese}</p>
                  <p className="text-sm text-[#0891b2] font-semibold">{currentWord.pinyin}</p>
                  <p className="text-xs text-gray-400">{currentWord.meaning}</p>
                </div>
                <button
                  onClick={handleWordTestReady}
                  className="mt-5 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-7 py-2.5 rounded-full shadow-premium-emerald shadow-emerald-500/10 hover:bg-emerald-600 active:scale-95 transition-all"
                >
                  Ready! <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div>
                <p className="text-center text-sm text-gray-500 mb-2">Which word did you just see?</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-2.5 rounded-full transition-all ${i < correctCount ? 'w-2.5 bg-green-500' : 'w-2.5 bg-gray-200'}`} />
                  ))}
                </div>

                {options.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-amber-800">The answer choices are still loading.</p>
                    <button
                      type="button"
                      onClick={() => fetchRound(currentWord.id, 'wordtest')}
                      className="mt-3 rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 active:scale-95"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                  {options.map((opt) => {
                    const isCorrect = opt.id === currentWord.id;
                    const isSelected = selected === opt.id;
                    let style = 'border-gray-100 hover:border-[#0891b2]/30 hover:shadow-premium hover:bg-cyan-50/30';
                    if (feedback === 'correct' && isCorrect) style = 'border-green-500 bg-green-50';
                    if (feedback === 'wrong' && isSelected) style = 'border-red-500 bg-red-50';

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleWordChoice(opt)}
                        disabled={!!feedback}
                        className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] ${style}`}
                      >
                        <div className="flex-1 text-left">
                          <p className="text-xl font-black text-gray-900">{opt.chinese}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{opt.pinyin}</p>
                        </div>
                        {feedback === 'correct' && isCorrect && <Check size={22} className="text-green-500" />}
                        {feedback === 'wrong' && isSelected && <X size={22} className="text-red-500" />}
                      </button>
                    );
                  })}
                  </div>
                )}

                {feedback === 'correct' && (
                  <p className="text-center text-green-600 font-bold text-sm mt-3" style={{ animation: 'slideIn 0.3s ease-out both' }}>
                    Correct! Well done
                  </p>
                )}
                {feedback === 'wrong' && (
                  <p className="text-center text-red-500 font-bold text-sm mt-3" style={{ animation: 'shake 0.4s ease-out both' }}>
                    Not quite. Try again!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────── STAGE: SENTENCE ─────────── */}
      {stage === 'sentence' && currentWord && (
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-premium overflow-hidden" style={{ animation: 'panelIn 0.4s ease-out both' }}>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-2.5 flex items-center gap-2">
            <Star size={16} className="text-white" />
            <span className="text-white font-bold text-sm">Step 3: Use in a Sentence</span>
          </div>

          <div className="flex-1 flex flex-col justify-start p-5 pt-6">
            {showCard ? (
              <div>
                <p className="text-xs text-gray-400 mb-2 text-center">Listen to the sentence:</p>
                {currentWord.sentence_hanzi && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-4">
                    <p className="text-xl sm:text-2xl font-black text-gray-900 text-center leading-relaxed">
                      {renderSentence(currentWord.sentence_hanzi, currentWord.chinese)}
                    </p>
                    <p className="text-sm text-amber-600 font-semibold text-center mt-1">{currentWord.sentence_pinyin}</p>
                    <p className="text-xs text-gray-400 text-center mt-0.5">{currentWord.sentence_meaning}</p>
                  </div>
                )}

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleSentenceListen}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-premium-lg transition-all hover:scale-110 active:scale-95 ${
                      sentenceListenCount >= 2
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/10'
                        : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/10'
                    }`}
                  >
                    <Volume2 size={24} className="text-white" />
                  </button>
                  {currentWord.sentence_audio_url && (
                    <>
                      <div className="flex items-center gap-2">
                        {[0, 1].map((i) => (
                          <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < sentenceListenCount ? 'bg-green-500 scale-110' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {sentenceListenCount === 0
                          ? 'Tap to listen (2 times)'
                          : sentenceListenCount < 2
                            ? `Listen ${2 - sentenceListenCount} more time`
                            : 'Great! Ready to practice'}
                      </p>
                    </>
                  )}
                  <button
                    onClick={handleSentenceReady}
                    disabled={!!currentWord.sentence_audio_url && sentenceListenCount < 2}
                    className={`mt-1 inline-flex items-center gap-2 font-bold px-7 py-2.5 rounded-full transition-all ${
                      !currentWord.sentence_audio_url || sentenceListenCount >= 2
                        ? 'bg-amber-500 text-white shadow-premium-amber shadow-amber-500/10 hover:bg-amber-600 active:scale-95'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Ready! <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-center text-sm text-gray-500 mb-2">Fill in the blank:</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-2.5 rounded-full transition-all ${i < correctCount ? 'w-2.5 bg-green-500' : 'w-2.5 bg-gray-200'}`} />
                  ))}
                </div>

                {currentWord.sentence_hanzi && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-4">
                    <p className="text-xl sm:text-2xl font-black text-gray-900 text-center leading-relaxed">
                      {renderSentenceWithBlank(currentWord.sentence_hanzi, currentWord.chinese, selected ? options.find((o) => o.id === selected)?.chinese : null)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5">
                  {options.map((opt) => {
                    const isCorrect = opt.id === currentWord.id;
                    const isSelected = selected === opt.id;
                    let style = 'border-gray-100 hover:border-amber-500/40 hover:shadow-premium hover:bg-amber-50/30';
                    if (feedback === 'correct' && isCorrect) style = 'border-green-500 bg-green-50';
                    if (feedback === 'wrong' && isSelected) style = 'border-red-500 bg-red-50';

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSentenceChoice(opt)}
                        disabled={!!feedback}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] ${style}`}
                      >
                        <div className="flex-1 text-left">
                          <p className="text-lg font-black text-gray-900">{opt.chinese}</p>
                          <p className="text-xs text-gray-400">{opt.pinyin}</p>
                        </div>
                        {feedback === 'correct' && isCorrect && <Check size={20} className="text-green-500" />}
                        {feedback === 'wrong' && isSelected && <X size={20} className="text-red-500" />}
                      </button>
                    );
                  })}
                </div>

                {feedback === 'correct' && (
                  <p className="text-center text-green-600 font-bold text-sm mt-3" style={{ animation: 'slideIn 0.3s ease-out both' }}>
                    Perfect! 
                  </p>
                )}
                {feedback === 'wrong' && (
                  <p className="text-center text-red-500 font-bold text-sm mt-3" style={{ animation: 'shake 0.4s ease-out both' }}>
                    Try again!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* ─────────── ACHIEVEMENT POPUP ─────────── */}
      {showAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" style={{ animation: 'fadeIn 0.3s ease-out both' }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-premium-lg" style={{ animation: 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full blur-xl opacity-50" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-premium-lg">
                <Trophy size={48} className="text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Lesson Complete!</h2>
            <p className="text-sm text-gray-400 mb-5">You mastered all {words.length} words</p>

            <div className="flex items-center justify-center gap-2 mb-6">
              {[0, 1, 2].map((i) => (
                <Star key={i} size={32} className="text-amber-400 fill-amber-400" style={{ animation: `popIn 0.4s ease-out ${0.2 + i * 0.15}s both` }} />
              ))}
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => { goBack(`/episode/${id}/activity/character`); }}
                className="w-full bg-[#0891b2] text-white font-bold py-3.5 rounded-2xl shadow-premium-blue shadow-[#0891b2]/10 hover:bg-[#0e7490] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={18} />
              </button>
              <button
                onClick={() => { goBack(`/episode/${id}/activity/character`); }}
                className="w-full text-gray-500 font-semibold py-2.5 rounded-2xl hover:bg-gray-50 transition"
              >
                Back to Lessons
              </button>
            </div>
          </div>
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

function renderSentence(sentence: string, target: string) {
  const parts = sentence.split(target);
  if (parts.length < 2) return sentence;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="text-[#0891b2] underline decoration-2 underline-offset-4 decoration-[#0891b2] font-black">{target}</span>
          )}
        </span>
      ))}
    </>
  );
}

function renderSentenceWithBlank(sentence: string, target: string, filled: string | null | undefined) {
  const parts = sentence.split(target);
  if (parts.length < 2) return sentence;
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            filled ? (
              <span className={`inline-block min-w-16 px-2 h-9 leading-9 rounded-lg mx-1 align-middle text-center ${
                filled === target
                  ? 'bg-green-100 border-2 border-green-400 text-green-700'
                  : 'bg-red-100 border-2 border-red-400 text-red-700'
              }`}>
                {filled}
              </span>
            ) : (
              <span className="inline-block w-16 h-9 bg-amber-200/50 border-2 border-dashed border-amber-400 rounded-lg mx-1 align-middle" />
            )
          )}
        </span>
      ))}
    </>
  );
}
