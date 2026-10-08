import { useState, type FormEvent } from 'react';
import { Plus, X, Trash2, Type, Check, Pencil } from 'lucide-react';
import { supabase, type Episode, type CharLesson, type CharWord } from '../lib/supabase';
import { useDragReorder } from '../lib/useDragReorder';
import DragHandle from './DragHandle';

export default function AdminCharWordTab({ episodes, charLessons, setCharLessons }: { episodes: Episode[]; charLessons: CharLesson[]; setCharLessons: (l: CharLesson[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', episode_id: 1, sort_order: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wordsByLesson, setWordsByLesson] = useState<Record<string, CharWord[]>>({});

  const drag = useDragReorder(charLessons, (newLessons: CharLesson[]) => {
    setCharLessons(newLessons);
    newLessons.forEach((l, i) => {
      if (l.sort_order !== i) supabase.from('char_lessons').update({ sort_order: i }).eq('id', l.id).then();
    });
  });

  async function loadWords(lessonId: string) {
    const { data } = await supabase.from('char_words').select('*').eq('lesson_id', lessonId).order('sort_order');
    setWordsByLesson((prev) => ({ ...prev, [lessonId]: (data ?? []) as CharWord[] }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error } = await supabase.from('char_lessons').insert({ title: form.title, episode_id: form.episode_id, sort_order: charLessons.length }).select().single();
    if (error) setError(error.message);
    else if (data) { setCharLessons([...charLessons, data as CharLesson]); setShowForm(false); setForm({ title: '', episode_id: 1, sort_order: 0 }); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this character lesson and all its words?')) return;
    const { error } = await supabase.from('char_lessons').delete().eq('id', id);
    if (!error) setCharLessons(charLessons.filter((l) => l.id !== id));
  }

  function toggleExpand(lessonId: string) {
    if (expandedId === lessonId) { setExpandedId(null); return; }
    setExpandedId(lessonId);
    if (!wordsByLesson[lessonId]) loadWords(lessonId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">Character Lessons ({charLessons.length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 bg-[#0891b2] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-cyan-700 transition active:scale-95">
          {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Cancel' : 'New Lesson'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Places & Directions" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Episode</label>
            <select value={form.episode_id} onChange={(e) => setForm({ ...form, episode_id: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 bg-white">
              {episodes.map((ep) => <option key={ep.id} value={ep.id}>Episode {ep.id}: {ep.title}</option>)}
            </select>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</div>}
          <button type="submit" disabled={saving} className="w-full bg-[#0891b2] text-white font-semibold py-2.5 rounded-xl hover:bg-cyan-700 transition active:scale-95 disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Lesson'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {charLessons.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Type size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No character lessons yet. Create one and add words!</p>
          </div>
        )}
        {charLessons.map((cl, i) => (
          <div key={cl.id}
            draggable
            onDragStart={() => drag.handleDragStart(i, cl.id)}
            onDragOver={(e) => drag.handleDragOver(e, i)}
            onDrop={(e) => drag.handleDrop(e, i)}
            onDragEnd={drag.handleDragEnd}
            className={`bg-white rounded-2xl border overflow-hidden transition-all ${
              drag.dragIndex === i ? 'opacity-40 border-cyan-300' : 'border-gray-100'
            } ${drag.dragOverIndex === i && drag.dragIndex !== i ? 'border-t-2 border-t-cyan-400' : ''}`}
          >
            <div className="p-4 flex items-center gap-3">
              <DragHandle />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0891b2] to-[#155e75] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                E{cl.episode_id}
              </div>
              <button onClick={() => toggleExpand(cl.id)} className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-gray-900 text-sm truncate">{cl.title}</p>
                <p className="text-xs text-gray-400">{wordsByLesson[cl.id]?.length ?? '...'} words · Order {cl.sort_order}</p>
              </button>
              <button onClick={() => toggleExpand(cl.id)} className="text-[#0891b2] text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-cyan-50 transition">
                {expandedId === cl.id ? 'Hide' : 'Manage Words'}
              </button>
              <button onClick={() => handleDelete(cl.id)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0 flex items-center justify-center">
                <Trash2 size={16} />
              </button>
            </div>
            {expandedId === cl.id && (
              <WordManager lessonId={cl.id} words={wordsByLesson[cl.id] ?? []} onChange={() => loadWords(cl.id)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WORD MANAGER — with drag reorder ──
function WordManager({ lessonId, words, onChange }: { lessonId: string; words: CharWord[]; onChange: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    chinese: '', pinyin: '', meaning: '', image_url: '', audio_url: '',
    sentence_hanzi: '', sentence_pinyin: '', sentence_meaning: '', sentence_audio_url: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    chinese: '', pinyin: '', meaning: '', image_url: '', audio_url: '',
    sentence_hanzi: '', sentence_pinyin: '', sentence_meaning: '', sentence_audio_url: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const drag = useDragReorder(words, async (newWords: CharWord[]) => {
    newWords.forEach((w, i) => {
      if (w.sort_order !== i) supabase.from('char_words').update({ sort_order: i }).eq('id', w.id).then();
    });
    onChange();
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('char_words').insert({
      lesson_id: lessonId, chinese: form.chinese, pinyin: form.pinyin, meaning: form.meaning,
      image_url: form.image_url || null, audio_url: form.audio_url || null,
      sentence_hanzi: form.sentence_hanzi || null, sentence_pinyin: form.sentence_pinyin || null,
      sentence_meaning: form.sentence_meaning || null, sentence_audio_url: form.sentence_audio_url || null,
      sort_order: words.length,
    });
    if (error) setError(error.message);
    else {
      setShowForm(false);
      setForm({ chinese: '', pinyin: '', meaning: '', image_url: '', audio_url: '', sentence_hanzi: '', sentence_pinyin: '', sentence_meaning: '', sentence_audio_url: '' });
      onChange();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this word?')) return;
    const { error } = await supabase.from('char_words').delete().eq('id', id);
    if (!error) onChange();
  }

  function startEdit(w: CharWord) {
    setEditingId(w.id);
    setEditForm({
      chinese: w.chinese, pinyin: w.pinyin, meaning: w.meaning,
      image_url: w.image_url ?? '', audio_url: w.audio_url ?? '',
      sentence_hanzi: w.sentence_hanzi ?? '', sentence_pinyin: w.sentence_pinyin ?? '',
      sentence_meaning: w.sentence_meaning ?? '', sentence_audio_url: w.sentence_audio_url ?? '',
    });
    setEditError(null);
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setEditError(null);
    const { error } = await supabase.from('char_words').update({
      chinese: editForm.chinese, pinyin: editForm.pinyin, meaning: editForm.meaning,
      image_url: editForm.image_url || null, audio_url: editForm.audio_url || null,
      sentence_hanzi: editForm.sentence_hanzi || null, sentence_pinyin: editForm.sentence_pinyin || null,
      sentence_meaning: editForm.sentence_meaning || null, sentence_audio_url: editForm.sentence_audio_url || null,
    }).eq('id', id);
    if (error) setEditError(error.message);
    else {
      setEditingId(null);
      onChange();
    }
    setEditSaving(false);
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-700 text-sm">Words ({words.length})</h4>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 bg-[#0891b2] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-cyan-700 transition active:scale-95">
          {showForm ? <X size={14} /> : <Plus size={14} />}{showForm ? 'Cancel' : 'Add Word'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chinese (Hanzi) *</label>
              <input type="text" required value={form.chinese} onChange={(e) => setForm({ ...form, chinese: e.target.value })}
                placeholder="附近" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pinyin *</label>
              <input type="text" required value={form.pinyin} onChange={(e) => setForm({ ...form, pinyin: e.target.value })}
                placeholder="fùjìn" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Meaning *</label>
            <input type="text" required value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })}
              placeholder="nearby" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
              <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..." className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Audio URL</label>
              <input type="url" value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                placeholder="https://..." className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Example Sentence (Step 3)</p>
            <div className="grid grid-cols-1 gap-2">
              <input type="text" value={form.sentence_hanzi} onChange={(e) => setForm({ ...form, sentence_hanzi: e.target.value })}
                placeholder="Sentence: 这附近有很多人" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
              <input type="text" value={form.sentence_pinyin} onChange={(e) => setForm({ ...form, sentence_pinyin: e.target.value })}
                placeholder="Pinyin: zhè fùjìn yǒu hěn duō rén" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
              <input type="text" value={form.sentence_meaning} onChange={(e) => setForm({ ...form, sentence_meaning: e.target.value })}
                placeholder="Meaning: There are many people nearby here" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
              <input type="url" value={form.sentence_audio_url} onChange={(e) => setForm({ ...form, sentence_audio_url: e.target.value })}
                placeholder="Sentence audio URL" className="w-full px-2.5 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={saving} className="w-full bg-[#0891b2] text-white font-semibold py-2.5 rounded-xl hover:bg-cyan-700 transition active:scale-95 disabled:opacity-50 text-sm">
            {saving ? 'Saving...' : 'Add Word'}
          </button>
          <p className="text-xs text-gray-400 text-center">Tip: Add 5-10 words. Students get 5 random; extra words become distractors.</p>
        </form>
      )}

      <div className="space-y-1.5">
        {words.length === 0 && !showForm && (
          <p className="text-xs text-gray-400 text-center py-3">No words yet. Add 5-10 words for this lesson.</p>
        )}
        {words.map((w, i) => (
          <div key={w.id}
            draggable={editingId !== w.id}
            onDragStart={() => drag.handleDragStart(i, w.id)}
            onDragOver={(e) => drag.handleDragOver(e, i)}
            onDrop={(e) => drag.handleDrop(e, i)}
            onDragEnd={drag.handleDragEnd}
            className={`bg-white rounded-xl border p-3 transition-all ${
              drag.dragIndex === i ? 'opacity-40 border-cyan-300' : 'border-gray-100'
            } ${drag.dragOverIndex === i && drag.dragIndex !== i ? 'border-t-2 border-t-cyan-400' : ''}`}
          >
            {editingId === w.id ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Edit Word</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => saveEdit(w.id)} disabled={editSaving} className="w-7 h-7 rounded-lg bg-[#0891b2] text-white hover:bg-cyan-700 transition flex items-center justify-center disabled:opacity-50">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 transition flex items-center justify-center">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={editForm.chinese} onChange={(e) => setEditForm({ ...editForm, chinese: e.target.value })}
                    placeholder="Chinese" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                  <input type="text" value={editForm.pinyin} onChange={(e) => setEditForm({ ...editForm, pinyin: e.target.value })}
                    placeholder="Pinyin" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                </div>
                <input type="text" value={editForm.meaning} onChange={(e) => setEditForm({ ...editForm, meaning: e.target.value })}
                  placeholder="Meaning" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="url" value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    placeholder="Image URL" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                  <input type="url" value={editForm.audio_url} onChange={(e) => setEditForm({ ...editForm, audio_url: e.target.value })}
                    placeholder="Audio URL" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                </div>
                <div className="pt-1.5 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sentence</p>
                  <div className="space-y-2">
                    <input type="text" value={editForm.sentence_hanzi} onChange={(e) => setEditForm({ ...editForm, sentence_hanzi: e.target.value })}
                      placeholder="Sentence hanzi" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                    <input type="text" value={editForm.sentence_pinyin} onChange={(e) => setEditForm({ ...editForm, sentence_pinyin: e.target.value })}
                      placeholder="Sentence pinyin" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                    <input type="text" value={editForm.sentence_meaning} onChange={(e) => setEditForm({ ...editForm, sentence_meaning: e.target.value })}
                      placeholder="Sentence meaning" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                    <input type="url" value={editForm.sentence_audio_url} onChange={(e) => setEditForm({ ...editForm, sentence_audio_url: e.target.value })}
                      placeholder="Sentence audio URL" className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm" />
                  </div>
                </div>
                {editError && <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2">{editError}</div>}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <DragHandle size={12} />
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{w.chinese} <span className="text-[#0891b2] font-normal text-xs">{w.pinyin}</span></p>
                  <p className="text-xs text-gray-400 truncate">{w.meaning}{w.sentence_hanzi ? ` · ${w.sentence_hanzi}` : ''}</p>
                </div>
                <button onClick={() => startEdit(w)} className="w-7 h-7 rounded-lg text-gray-400 hover:bg-cyan-50 hover:text-[#0891b2] transition flex-shrink-0 flex items-center justify-center">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(w.id)} className="w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0 flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
