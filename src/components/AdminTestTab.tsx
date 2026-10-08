import { useEffect, useState, type FormEvent } from 'react';
import { FlaskConical, Plus, X, Check, Trash2, FileText, AlignLeft, Mic, Video } from 'lucide-react';
import { supabase, type Episode, type FinalTest, type FinalTestQuestion } from '../lib/supabase';
import { useDragReorder } from '../lib/useDragReorder';
import DragHandle from './DragHandle';

const QUESTION_TYPE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  character: { label: 'Character', icon: FileText,  color: 'text-[#0891b2]',   bg: 'bg-cyan-50'   },
  sentence:  { label: 'Sentence',  icon: AlignLeft, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  speaking:  { label: 'Speaking',  icon: Mic,       color: 'text-rose-500',    bg: 'bg-rose-50'   },
  vlog:      { label: 'Vlog',      icon: Video,     color: 'text-purple-600',  bg: 'bg-purple-50' },
};

export default function AdminTestTab({ episodes, finalTests, setFinalTests }: { episodes: Episode[]; finalTests: FinalTest[]; setFinalTests: (t: FinalTest[]) => void }) {
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(episodes.length > 0 ? episodes[0].id : null);
  const [questions, setQuestions] = useState<FinalTestQuestion[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    question_type: 'character' as FinalTestQuestion['question_type'],
    question: '', chinese: '', pinyin: '',
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_option: 'a' as 'a' | 'b' | 'c' | 'd',
    audio_url: '', image_url: '',
  });

  const currentTest = finalTests.find((t) => t.episode_id === selectedEpisodeId);

  useEffect(() => {
    if (selectedEpisodeId === null) return;
    if (!currentTest) {
      supabase.from('final_tests').insert({
        episode_id: selectedEpisodeId,
        title: `Episode ${selectedEpisodeId} Final Test`,
        description: null,
        sort_order: 0,
      }).select().single().then(({ data, error }) => {
        if (data && !error) {
          setFinalTests([...finalTests, data as FinalTest]);
        }
      });
    }
  }, [selectedEpisodeId]);

  useEffect(() => {
    if (!currentTest) { setQuestions([]); return; }
    setLoadingQs(true);
    supabase.from('final_test_questions').select('*').eq('test_id', currentTest.id).order('sort_order').then(({ data }) => {
      setQuestions((data ?? []) as FinalTestQuestion[]);
      setLoadingQs(false);
    });
  }, [currentTest?.id]);

  const drag = useDragReorder(questions, async (newQs: FinalTestQuestion[]) => {
    setQuestions(newQs);
    newQs.forEach((q, i) => {
      if (q.sort_order !== i) supabase.from('final_test_questions').update({ sort_order: i }).eq('id', q.id).then();
    });
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentTest) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('final_test_questions').insert({
      test_id: currentTest.id,
      question_type: form.question_type,
      question: form.question,
      chinese: form.chinese || null,
      pinyin: form.pinyin || null,
      option_a: form.option_a, option_b: form.option_b, option_c: form.option_c, option_d: form.option_d,
      correct_option: form.correct_option,
      audio_url: form.audio_url || null,
      image_url: form.image_url || null,
      sort_order: questions.length,
    });
    if (error) setError(error.message);
    else {
      setShowForm(false);
      setForm({ question_type: 'character', question: '', chinese: '', pinyin: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', audio_url: '', image_url: '' });
      const { data } = await supabase.from('final_test_questions').select('*').eq('test_id', currentTest.id).order('sort_order');
      setQuestions((data ?? []) as FinalTestQuestion[]);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this question?')) return;
    const { error } = await supabase.from('final_test_questions').delete().eq('id', id);
    if (!error) {
      const { data } = await supabase.from('final_test_questions').select('*').eq('test_id', currentTest!.id).order('sort_order');
      setQuestions((data ?? []) as FinalTestQuestion[]);
    }
  }

  async function handleDeleteTest() {
    if (!currentTest) return;
    if (!confirm('Delete this final test and all its questions?')) return;
    const { error } = await supabase.from('final_tests').delete().eq('id', currentTest.id);
    if (!error) {
      setFinalTests(finalTests.filter((t) => t.id !== currentTest.id));
      setQuestions([]);
    }
  }

  if (episodes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
        <FlaskConical size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Create episodes first, then manage their final tests here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-[#0891b2] to-[#155e75] rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <FlaskConical size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Final Tests</h2>
            <p className="text-xs text-cyan-200/70">Choose an episode to manage its final test. The test auto-creates and appears at the bottom of the lesson page.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Episode</label>
        <div className="flex flex-wrap gap-2">
          {episodes.map((ep) => (
            <button key={ep.id} onClick={() => setSelectedEpisodeId(ep.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-sm transition active:scale-95 ${
                selectedEpisodeId === ep.id ? 'bg-[#0891b2] text-white shadow-premium-blue shadow-cyan-500/10' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
              }`}>
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${selectedEpisodeId === ep.id ? 'bg-white/20' : 'bg-gray-200'}`}>{ep.id}</span>
              {ep.title}
            </button>
          ))}
        </div>
      </div>

      {currentTest && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{currentTest.title}</h3>
              <p className="text-xs text-gray-400">{questions.length} questions · Auto-placed at bottom of lesson page</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 bg-[#0891b2] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-cyan-700 transition active:scale-95">
                {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Cancel' : 'Add Question'}
              </button>
              <button onClick={handleDeleteTest} className="w-9 h-9 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center border border-gray-100">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Activity Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(QUESTION_TYPE_LABELS).map(([key, val]) => {
                    const Icon = val.icon;
                    const active = form.question_type === key;
                    return (
                      <button key={key} type="button" onClick={() => setForm({ ...form, question_type: key as FinalTestQuestion['question_type'] })}
                        className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 transition ${active ? 'border-[#0891b2] bg-cyan-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <Icon size={16} className={active ? 'text-[#0891b2]' : val.color} />
                        <span className={`text-[10px] font-semibold ${active ? 'text-[#0891b2]' : 'text-gray-500'}`}>{val.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Question *</label>
                <input type="text" required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="What does 附近 mean?" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chinese (optional)</label>
                  <input type="text" value={form.chinese} onChange={(e) => setForm({ ...form, chinese: e.target.value })}
                    placeholder="附近" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pinyin (optional)</label>
                  <input type="text" value={form.pinyin} onChange={(e) => setForm({ ...form, pinyin: e.target.value })}
                    placeholder="fùjìn" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Answer Options *</label>
                {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <button type="button" onClick={() => setForm({ ...form, correct_option: opt })}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase transition flex-shrink-0 ${
                        form.correct_option === opt ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                      {form.correct_option === opt ? <Check size={14} /> : opt}
                    </button>
                    <input type="text" required value={form[`option_${opt}`]} onChange={(e) => setForm({ ...form, [`option_${opt}`]: e.target.value })}
                      placeholder={`Option ${opt.toUpperCase()}`}
                      className={`flex-1 px-2.5 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-cyan-500 text-sm ${
                        form.correct_option === opt ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                      }`} />
                  </div>
                ))}
                <p className="text-xs text-gray-400">Tap the circle to mark the correct answer.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Audio URL (optional)</label>
                  <input type="url" value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                    placeholder="https://..." className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Image URL (optional)</label>
                  <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..." className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                </div>
              </div>
              {error && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={saving} className="w-full bg-[#0891b2] text-white font-semibold py-2.5 rounded-xl hover:bg-cyan-700 transition active:scale-95 disabled:opacity-50 text-sm">
                {saving ? 'Saving...' : 'Add Question'}
              </button>
            </form>
          )}

          {loadingQs ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-16" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {questions.length === 0 && !showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                  <FlaskConical size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No questions yet. Add questions covering all 4 activities.</p>
                </div>
              )}
              {questions.map((q, i) => {
                const typeInfo = QUESTION_TYPE_LABELS[q.question_type] ?? QUESTION_TYPE_LABELS.character;
                const Icon = typeInfo.icon;
                return (
                  <div key={q.id}
                    draggable
                    onDragStart={() => drag.handleDragStart(i, q.id)}
                    onDragOver={(e) => drag.handleDragOver(e, i)}
                    onDrop={(e) => drag.handleDrop(e, i)}
                    onDragEnd={drag.handleDragEnd}
                    className={`bg-white rounded-xl border p-3 flex items-start gap-3 transition-all ${
                      drag.dragIndex === i ? 'opacity-40 border-cyan-300' : 'border-gray-100'
                    } ${drag.dragOverIndex === i && drag.dragIndex !== i ? 'border-t-2 border-t-cyan-400' : ''}`}
                  >
                    <DragHandle size={14} />
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                          <Icon size={10} /> {typeInfo.label}
                        </span>
                        {q.chinese && <span className="text-sm font-bold text-gray-900">{q.chinese}</span>}
                      </div>
                      <p className="text-sm text-gray-700 font-medium">{q.question}</p>
                      <p className="text-xs text-gray-400 mt-1">A: {q.option_a} · B: {q.option_b} · C: {q.option_c} · D: {q.option_d}</p>
                      <p className="text-xs text-green-600 font-semibold mt-0.5">Correct: {q.correct_option.toUpperCase()}</p>
                    </div>
                    <button onClick={() => handleDelete(q.id)} className="w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
