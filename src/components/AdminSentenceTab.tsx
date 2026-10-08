import { useEffect, useState, type FormEvent } from 'react';
import {
  Plus, X, Trash2, ChevronDown, ChevronUp, Pencil,
  Volume2, MessageCircle, AlignLeft,
} from 'lucide-react';
import { supabase, type Episode, type SentenceLesson, type SentenceQuestion, type WordTile, type SlotConfig } from '../lib/supabase';
import { useDragReorder } from '../lib/useDragReorder';
import DragHandle from './DragHandle';

// ── Main component ───────────────────────────────────────────────
export default function AdminSentenceTab({ episodes }: { episodes: Episode[] }) {
  const [selectedEpId, setSelectedEpId] = useState<number | null>(episodes.length > 0 ? episodes[0].id : null);
  const [lessons, setLessons] = useState<SentenceLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (selectedEpId === null) return;
    setLoading(true);
    supabase.from('sentence_lessons').select('*').eq('episode_id', selectedEpId).order('sort_order').then(({ data }) => {
      setLessons((data ?? []) as SentenceLesson[]);
      setLoading(false);
    });
  }, [selectedEpId]);

  const drag = useDragReorder(lessons, (newLessons: SentenceLesson[]) => {
    setLessons(newLessons);
    newLessons.forEach((l, i) => {
      if (l.sort_order !== i) supabase.from('sentence_lessons').update({ sort_order: i }).eq('id', l.id).then();
    });
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!selectedEpId || !newTitle.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('sentence_lessons').insert({
      episode_id: selectedEpId,
      title: newTitle.trim(),
      sort_order: lessons.length,
    }).select().single();
    if (!error && data) {
      setLessons([...lessons, data as SentenceLesson]);
      setNewTitle('');
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson and all its questions?')) return;
    const { error } = await supabase.from('sentence_lessons').delete().eq('id', id);
    if (!error) setLessons(lessons.filter((l) => l.id !== id));
  }

  function startEditLesson(l: SentenceLesson) {
    setEditingLessonId(l.id);
    setEditTitle(l.title);
  }

  async function saveEditLesson(id: string) {
    if (!editTitle.trim()) return;
    const { error } = await supabase.from('sentence_lessons').update({ title: editTitle.trim() }).eq('id', id);
    if (!error) {
      setLessons(lessons.map((l) => (l.id === id ? { ...l, title: editTitle.trim() } : l)));
      setEditingLessonId(null);
    }
  }

  if (episodes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
        <AlignLeft size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Create episodes first, then add Sentence Journey lessons.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <AlignLeft size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Sentence Journey</h2>
            <p className="text-xs text-emerald-100/70">Create, edit, and reorder fill-in-blank and dialogue questions for each lesson.</p>
          </div>
        </div>
      </div>

      {/* Episode selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Episode</label>
        <div className="flex flex-wrap gap-2">
          {episodes.map((ep) => (
            <button key={ep.id} onClick={() => setSelectedEpId(ep.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-sm transition active:scale-95 ${
                selectedEpId === ep.id ? 'bg-emerald-500 text-white shadow-premium-emerald shadow-emerald-500/10' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
              }`}>
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${selectedEpId === ep.id ? 'bg-white/20' : 'bg-gray-200'}`}>{ep.id}</span>
              {ep.title}
            </button>
          ))}
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">Lessons ({lessons.length})</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-emerald-600 transition active:scale-95">
          {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Cancel' : 'New Lesson'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex gap-2">
          <input
            type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Lesson title e.g. Places & Directions"
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          <button type="submit" disabled={saving}
            className="bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50 text-sm whitespace-nowrap">
            {saving ? 'Saving...' : 'Create'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse h-16" />)}
        </div>
      ) : lessons.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <AlignLeft size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No lessons yet for this episode.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, i) => (
            <div key={lesson.id}
              draggable
              onDragStart={() => drag.handleDragStart(i, lesson.id)}
              onDragOver={(e) => drag.handleDragOver(e, i)}
              onDrop={(e) => drag.handleDrop(e, i)}
              onDragEnd={drag.handleDragEnd}
              className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                drag.dragIndex === i ? 'opacity-40 border-emerald-300' : 'border-gray-100'
              } ${drag.dragOverIndex === i && drag.dragIndex !== i ? 'border-t-2 border-t-emerald-400' : ''}`}
            >
              <div className="p-4 flex items-center gap-3">
                <DragHandle />
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {editingLessonId === lesson.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEditLesson(lesson.id); if (e.key === 'Escape') setEditingLessonId(null); }}
                        autoFocus
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold" />
                      <button onClick={() => saveEditLesson(lesson.id)} className="text-emerald-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-50">Save</button>
                      <button onClick={() => setEditingLessonId(null)} className="text-gray-400 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-100">Cancel</button>
                    </div>
                  ) : (
                    <p className="font-semibold text-gray-900 text-sm truncate">{lesson.title}</p>
                  )}
                </div>
                {editingLessonId !== lesson.id && (
                  <button onClick={() => startEditLesson(lesson)} title="Rename lesson"
                    className="w-8 h-8 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition flex items-center justify-center flex-shrink-0">
                    <Pencil size={15} />
                  </button>
                )}
                <button onClick={() => setExpandedId(expandedId === lesson.id ? null : lesson.id)}
                  className="text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition flex items-center gap-1">
                  {expandedId === lesson.id ? <><ChevronUp size={14} />Hide</> : <><ChevronDown size={14} />Questions</>}
                </button>
                <button onClick={() => handleDelete(lesson.id)}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>

              {expandedId === lesson.id && (
                <QuestionManager lessonId={lesson.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Question Manager ─────────────────────────────────────────────
function QuestionManager({ lessonId }: { lessonId: string }) {
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [qType, setQType] = useState<'fill_blank' | 'dialogue'>('fill_blank');
  const [editingQ, setEditingQ] = useState<SentenceQuestion | null>(null);

  useEffect(() => {
    supabase.from('sentence_questions').select('*').eq('lesson_id', lessonId).order('sort_order').then(({ data }) => {
      setQuestions((data ?? []) as SentenceQuestion[]);
      setLoading(false);
    });
  }, [lessonId]);

  const drag = useDragReorder(questions, (newQs: SentenceQuestion[]) => {
    setQuestions(newQs);
    newQs.forEach((q, i) => {
      if (q.sort_order !== i) supabase.from('sentence_questions').update({ sort_order: i }).eq('id', q.id).then();
    });
  });

  async function handleDelete(id: string) {
    if (!confirm('Delete this question?')) return;
    await supabase.from('sentence_questions').delete().eq('id', id);
    setQuestions(questions.filter((q) => q.id !== id));
  }

  function reloadQuestions() {
    supabase.from('sentence_questions').select('*').eq('lesson_id', lessonId).order('sort_order').then(({ data }) => {
      setQuestions((data ?? []) as SentenceQuestion[]);
    });
  }

  function startEdit(q: SentenceQuestion) {
    setEditingQ(q);
    setQType(q.question_type === 'dialogue' ? 'dialogue' : 'fill_blank');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingQ(null);
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Questions ({questions.length})</p>
        <button onClick={() => { setEditingQ(null); setShowForm(!showForm); }}
          className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-600 transition active:scale-95">
          {showForm ? <X size={12} /> : <Plus size={12} />}{showForm ? 'Cancel' : 'Add Question'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          {/* Type selector — disabled while editing */}
          <div className="flex gap-2 mb-4">
            <button type="button" disabled={!!editingQ} onClick={() => setQType('fill_blank')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition disabled:opacity-50 ${
                qType === 'fill_blank' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}>
              <AlignLeft size={15} /> Fill Blank
            </button>
            <button type="button" disabled={!!editingQ} onClick={() => setQType('dialogue')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition disabled:opacity-50 ${
                qType === 'dialogue' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}>
              <MessageCircle size={15} /> Dialogue
            </button>
          </div>

          {qType === 'fill_blank' ? (
            <FillBlankForm
              lessonId={lessonId}
              sortOrder={questions.length}
              editing={editingQ}
              onSaved={() => { closeForm(); reloadQuestions(); }}
              onCancel={closeForm}
            />
          ) : (
            <DialogueForm
              lessonId={lessonId}
              sortOrder={questions.length}
              editing={editingQ}
              onSaved={() => { closeForm(); reloadQuestions(); }}
              onCancel={closeForm}
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-1.5">
          {[1, 2].map((i) => <div key={i} className="bg-white rounded-lg border border-gray-100 h-12 animate-pulse" />)}
        </div>
      ) : questions.length === 0 && !showForm ? (
        <p className="text-xs text-gray-400 text-center py-3">No questions yet. Add fill-blank or dialogue questions.</p>
      ) : (
        <div className="space-y-1.5">
          {questions.map((q, i) => (
            <div key={q.id}
              draggable
              onDragStart={() => drag.handleDragStart(i, q.id)}
              onDragOver={(e) => drag.handleDragOver(e, i)}
              onDrop={(e) => drag.handleDrop(e, i)}
              onDragEnd={drag.handleDragEnd}
              className={`bg-white rounded-xl border p-3 flex items-center gap-3 transition-all ${
                drag.dragIndex === i ? 'opacity-40 border-emerald-300' : 'border-gray-100'
              } ${drag.dragOverIndex === i && drag.dragIndex !== i ? 'border-t-2 border-t-emerald-400' : ''}`}
            >
              <DragHandle size={12} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                q.question_type === 'fill_blank' ? 'bg-emerald-50 text-emerald-600' : 'bg-cyan-50 text-cyan-600'
              }`}>
                {q.question_type === 'fill_blank' ? 'FILL' : 'TALK'}
              </span>
              <div className="flex-1 min-w-0">
                {q.question_type === 'fill_blank' ? (
                  <>
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {q.preview_chinese || '(no preview word)'}{q.preview_meaning ? ` — ${q.preview_meaning}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{q.sentence_meaning || 'No meaning set'}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-gray-700 truncate">{q.speaker_a_chinese || '(A speaks…)'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{q.speaker_a_meaning || ''}</p>
                  </>
                )}
              </div>
              <button onClick={() => startEdit(q)} title="Edit question"
                className="w-7 h-7 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition flex items-center justify-center flex-shrink-0">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDelete(q.id)}
                className="w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Slot Config Builder ──────────────────────────────────────────
function SlotBuilder({ slots, onChange }: { slots: SlotConfig[]; onChange: (s: SlotConfig[]) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600">Sentence Slots (blanks + prefilled)</p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onChange([...slots, { prefilled: false }])}
            className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-100 transition">
            + Blank
          </button>
          <button type="button" onClick={() => onChange([...slots, { prefilled: true, text: '' }])}
            className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-lg hover:bg-teal-100 transition">
            + Prefilled
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[36px] bg-gray-50 rounded-lg p-2 border border-gray-100">
        {slots.map((slot, i) => (
          <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${
            slot.prefilled ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-dashed border-gray-300 text-gray-500'
          }`}>
            {slot.prefilled ? (
              <input
                type="text"
                value={slot.text ?? ''}
                onChange={(e) => {
                  const next = [...slots];
                  next[i] = { ...slot, text: e.target.value };
                  onChange(next);
                }}
                placeholder="text"
                className="w-14 bg-transparent outline-none text-xs font-semibold text-teal-700 placeholder-teal-300"
              />
            ) : (
              <span className="font-mono text-gray-400">blank</span>
            )}
            <button type="button" onClick={() => onChange(slots.filter((_, j) => j !== i))}
              className="text-gray-400 hover:text-red-500 transition ml-0.5">
              <X size={10} />
            </button>
          </div>
        ))}
        {slots.length === 0 && <span className="text-xs text-gray-300">Add blank or prefilled slots above</span>}
      </div>
    </div>
  );
}

// ── Word Tile Builder ────────────────────────────────────────────
function TileBuilder({ tiles, onChange, label = 'Word Tiles' }: { tiles: WordTile[]; onChange: (t: WordTile[]) => void; label?: string }) {
  const [draft, setDraft] = useState<WordTile>({ chinese: '', pinyin: '', audio_url: '', meaning: '' });
  const [adding, setAdding] = useState(false);

  function add() {
    if (!draft.chinese.trim()) return;
    onChange([...tiles, { ...draft }]);
    setDraft({ chinese: '', pinyin: '', audio_url: '', meaning: '' });
    setAdding(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        <button type="button" onClick={() => setAdding(!adding)}
          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition">
          {adding ? 'Cancel' : '+ Add Tile'}
        </button>
      </div>

      {adding && (
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={draft.chinese} onChange={(e) => setDraft({ ...draft, chinese: e.target.value })}
              placeholder="汉字 *" className="px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-xs" />
            <input type="text" value={draft.pinyin} onChange={(e) => setDraft({ ...draft, pinyin: e.target.value })}
              placeholder="pīnyīn" className="px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
              placeholder="meaning" className="px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-xs" />
            <input type="url" value={draft.audio_url} onChange={(e) => setDraft({ ...draft, audio_url: e.target.value })}
              placeholder="audio URL" className="px-2 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-xs" />
          </div>
          <button type="button" onClick={add}
            className="w-full bg-emerald-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-emerald-600 transition">
            Add Tile
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {tiles.map((t, i) => (
          <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs">
            <span className="font-bold text-gray-800">{t.chinese}</span>
            {t.pinyin && <span className="text-gray-400">{t.pinyin}</span>}
            {t.audio_url && <Volume2 size={10} className="text-emerald-500" />}
            <button type="button" onClick={() => onChange(tiles.filter((_, j) => j !== i))}
              className="text-gray-300 hover:text-red-500 transition ml-0.5">
              <X size={10} />
            </button>
          </div>
        ))}
        {tiles.length === 0 && <span className="text-xs text-gray-300">No tiles yet</span>}
      </div>
    </div>
  );
}

// ── Fill Blank Form ──────────────────────────────────────────────
function FillBlankForm({ lessonId, sortOrder, editing, onSaved, onCancel }: {
  lessonId: string;
  sortOrder: number;
  editing: SentenceQuestion | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    preview_chinese: editing?.preview_chinese ?? '',
    preview_pinyin: editing?.preview_pinyin ?? '',
    preview_meaning: editing?.preview_meaning ?? '',
    preview_audio_url: editing?.preview_audio_url ?? '',
    sentence_meaning: editing?.sentence_meaning ?? '',
    sentence_audio_url: editing?.sentence_audio_url ?? '',
    correct_answer_raw: (editing?.correct_answer ?? []).join(', '),
  });
  const [slots, setSlots] = useState<SlotConfig[]>((editing?.slot_config as SlotConfig[] | undefined) ?? []);
  const [tiles, setTiles] = useState<WordTile[]>((editing?.word_tiles as WordTile[] | undefined) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const correctArr = form.correct_answer_raw.split(',').map((s) => s.trim()).filter(Boolean);
    const blankCount = slots.filter((s) => !s.prefilled).length;
    if (correctArr.length !== blankCount) {
      setError(`Correct answer must have ${blankCount} token(s) matching the ${blankCount} blank slot(s).`);
      return;
    }
    setSaving(true);
    const payload = {
      lesson_id: lessonId,
      question_type: 'fill_blank' as const,
      preview_chinese: form.preview_chinese || null,
      preview_pinyin: form.preview_pinyin || null,
      preview_meaning: form.preview_meaning || null,
      preview_audio_url: form.preview_audio_url || null,
      sentence_meaning: form.sentence_meaning || null,
      sentence_audio_url: form.sentence_audio_url || null,
      slot_config: slots,
      word_tiles: tiles,
      correct_answer: correctArr,
    };
    let err: { message: string } | null = null;
    if (editing) {
      const r = await supabase.from('sentence_questions').update(payload).eq('id', editing.id);
      err = r.error as unknown as { message: string } | null;
    } else {
      const r = await supabase.from('sentence_questions').insert({ ...payload, sort_order: sortOrder });
      err = r.error as unknown as { message: string } | null;
    }
    if (err) setError((err as { message: string }).message);
    else onSaved();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Preview word */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Preview Card (optional — shown before exercise)</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={form.preview_chinese} onChange={(e) => setForm({ ...form, preview_chinese: e.target.value })}
            placeholder="附近" className="px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          <input type="text" value={form.preview_pinyin} onChange={(e) => setForm({ ...form, preview_pinyin: e.target.value })}
            placeholder="fùjìn" className="px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input type="text" value={form.preview_meaning} onChange={(e) => setForm({ ...form, preview_meaning: e.target.value })}
            placeholder="meaning: nearby" className="px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          <input type="url" value={form.preview_audio_url} onChange={(e) => setForm({ ...form, preview_audio_url: e.target.value })}
            placeholder="Word audio URL" className="px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Exercise</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="text" required value={form.sentence_meaning} onChange={(e) => setForm({ ...form, sentence_meaning: e.target.value })}
            placeholder="English meaning *" className="px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          <input type="url" value={form.sentence_audio_url} onChange={(e) => setForm({ ...form, sentence_audio_url: e.target.value })}
            placeholder="Full sentence audio URL" className="px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        </div>
      </div>

      <SlotBuilder slots={slots} onChange={setSlots} />
      <TileBuilder tiles={tiles} onChange={setTiles} />

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">
          Correct Answer — comma-separated tokens for each blank (in order)
        </p>
        <input type="text" required value={form.correct_answer_raw} onChange={(e) => setForm({ ...form, correct_answer_raw: e.target.value })}
          placeholder={`e.g. 附近, 医院 (${slots.filter((s)=>!s.prefilled).length} blank${slots.filter((s)=>!s.prefilled).length!==1?'s':''})`}
          className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        <p className="text-[10px] text-gray-400 mt-1">Must match the number of blank slots above.</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 bg-emerald-500 text-white font-semibold py-2.5 rounded-xl hover:bg-emerald-600 transition active:scale-95 disabled:opacity-50 text-sm">
          {saving ? 'Saving...' : editing ? 'Update Fill Blank Question' : 'Save Fill Blank Question'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Dialogue Form ────────────────────────────────────────────────
function DialogueForm({ lessonId, sortOrder, editing, onSaved, onCancel }: {
  lessonId: string;
  sortOrder: number;
  editing: SentenceQuestion | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const AVATAR_OPTIONS = ['👩', '👨', '👧', '👦', '👩‍🏫', '👨‍🏫', '🧑', '👤'];
  const [form, setForm] = useState({
    speaker_a_name: editing?.speaker_a_name ?? 'Teacher',
    speaker_a_avatar: editing?.speaker_a_avatar ?? '👩',
    speaker_a_chinese: editing?.speaker_a_chinese ?? '',
    speaker_a_meaning: editing?.speaker_a_meaning ?? '',
    speaker_a_audio_url: editing?.speaker_a_audio_url ?? '',
    speaker_b_name: editing?.speaker_b_name ?? 'You',
    speaker_b_avatar: editing?.speaker_b_avatar ?? '👤',
    speaker_b_prompt: editing?.speaker_b_prompt ?? '',
    speaker_b_audio_url: editing?.speaker_b_audio_url ?? '',
    speaker_b_correct_raw: (editing?.speaker_b_correct ?? []).join(', '),
  });
  const [tiles, setTiles] = useState<WordTile[]>((editing?.dialogue_word_tiles as WordTile[] | undefined) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const correctArr = form.speaker_b_correct_raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (correctArr.length === 0) {
      setError('Please enter at least one correct answer token.');
      return;
    }
    setSaving(true);
    const payload = {
      lesson_id: lessonId,
      question_type: 'dialogue' as const,
      speaker_a_name: form.speaker_a_name,
      speaker_a_avatar: form.speaker_a_avatar,
      speaker_a_chinese: form.speaker_a_chinese || null,
      speaker_a_meaning: form.speaker_a_meaning || null,
      speaker_a_audio_url: form.speaker_a_audio_url || null,
      speaker_b_name: form.speaker_b_name,
      speaker_b_avatar: form.speaker_b_avatar,
      speaker_b_prompt: form.speaker_b_prompt || null,
      speaker_b_correct: correctArr,
      speaker_b_audio_url: form.speaker_b_audio_url || null,
      dialogue_word_tiles: tiles,
    };
    let err: { message: string } | null = null;
    if (editing) {
      const r = await supabase.from('sentence_questions').update(payload).eq('id', editing.id);
      err = r.error as unknown as { message: string } | null;
    } else {
      const r = await supabase.from('sentence_questions').insert({ ...payload, sort_order: sortOrder });
      err = r.error as unknown as { message: string } | null;
    }
    if (err) setError((err as { message: string }).message);
    else onSaved();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Speaker A */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Speaker A</p>
        <div className="bg-cyan-50 rounded-xl p-3 border border-cyan-100 space-y-2">
          <div className="flex gap-2">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Avatar</p>
              <div className="flex gap-1 flex-wrap">
                {AVATAR_OPTIONS.slice(0, 4).map((av) => (
                  <button key={av} type="button" onClick={() => setForm({ ...form, speaker_a_avatar: av })}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition ${form.speaker_a_avatar === av ? 'bg-cyan-200 ring-2 ring-cyan-400' : 'bg-white hover:bg-cyan-100'}`}>
                    {av}
                  </button>
                ))}
              </div>
            </div>
            <input type="text" value={form.speaker_a_name} onChange={(e) => setForm({ ...form, speaker_a_name: e.target.value })}
              placeholder="Name" className="flex-1 px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-cyan-500 text-sm self-end" />
          </div>
          <input type="text" required value={form.speaker_a_chinese} onChange={(e) => setForm({ ...form, speaker_a_chinese: e.target.value })}
            placeholder="Chinese sentence *" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-cyan-500 text-sm" />
          <input type="text" value={form.speaker_a_meaning} onChange={(e) => setForm({ ...form, speaker_a_meaning: e.target.value })}
            placeholder="English meaning" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-cyan-500 text-sm" />
          <input type="url" value={form.speaker_a_audio_url} onChange={(e) => setForm({ ...form, speaker_a_audio_url: e.target.value })}
            placeholder="Audio URL (auto-plays)" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-cyan-500 text-sm" />
        </div>
      </div>

      {/* Speaker B */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Speaker B (User's response)</p>
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 space-y-2">
          <div className="flex gap-2">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Avatar</p>
              <div className="flex gap-1 flex-wrap">
                {AVATAR_OPTIONS.slice(4).map((av) => (
                  <button key={av} type="button" onClick={() => setForm({ ...form, speaker_b_avatar: av })}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition ${form.speaker_b_avatar === av ? 'bg-emerald-200 ring-2 ring-emerald-400' : 'bg-white hover:bg-emerald-100'}`}>
                    {av}
                  </button>
                ))}
              </div>
            </div>
            <input type="text" value={form.speaker_b_name} onChange={(e) => setForm({ ...form, speaker_b_name: e.target.value })}
              placeholder="Name" className="flex-1 px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-sm self-end" />
          </div>
          <input type="text" value={form.speaker_b_prompt} onChange={(e) => setForm({ ...form, speaker_b_prompt: e.target.value })}
            placeholder="Hint/context for user (e.g. Say hello back)" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-sm" />
          <input type="text" required value={form.speaker_b_correct_raw} onChange={(e) => setForm({ ...form, speaker_b_correct_raw: e.target.value })}
            placeholder="Correct tokens: 你, 好 (comma-separated)" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-sm" />
          <input type="url" value={form.speaker_b_audio_url} onChange={(e) => setForm({ ...form, speaker_b_audio_url: e.target.value })}
            placeholder="Answer audio URL (plays when correct)" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 text-sm" />
        </div>
      </div>

      <TileBuilder tiles={tiles} onChange={setTiles} label="Word Tiles for User" />

      {error && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 bg-cyan-500 text-white font-semibold py-2.5 rounded-xl hover:bg-cyan-600 transition active:scale-95 disabled:opacity-50 text-sm">
          {saving ? 'Saving...' : editing ? 'Update Dialogue Question' : 'Save Dialogue Question'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
