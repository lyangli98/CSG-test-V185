import { useState, type FormEvent } from 'react';
import { Plus, X, Trash2, Video, Clock } from 'lucide-react';
import { supabase, type Episode, type Lesson } from '../lib/supabase';
import { useDragReorder } from '../lib/useDragReorder';
import DragHandle from './DragHandle';

export default function AdminLessonTab({ episodes, lessons, setLessons }: { episodes: Episode[]; lessons: Lesson[]; setLessons: (l: Lesson[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ episode_id: '1', lesson_number: '', title: '', subtitle: '', youtube_id: '', duration_minutes: '10' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drag = useDragReorder(lessons, (newLessons: Lesson[]) => {
    setLessons(newLessons);
    newLessons.forEach((l, i) => {
      if (l.sort_order !== i) supabase.from('lessons').update({ sort_order: i }).eq('id', l.id).then();
    });
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const epLessons = lessons.filter((l) => l.episode_id === Number(form.episode_id));
    const { data, error } = await supabase.from('lessons').insert({
      episode_id: Number(form.episode_id),
      lesson_number: Number(form.lesson_number),
      title: form.title,
      subtitle: form.subtitle,
      youtube_id: form.youtube_id,
      duration_minutes: Number(form.duration_minutes),
      sort_order: epLessons.length,
    }).select().single();
    if (error) setError(error.message);
    else if (data) {
      setLessons([...lessons, data as Lesson].sort((a, b) => a.episode_id - b.episode_id || a.sort_order - b.sort_order));
      setShowForm(false);
      setForm({ episode_id: '1', lesson_number: '', title: '', subtitle: '', youtube_id: '', duration_minutes: '10' });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson?')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (!error) setLessons(lessons.filter((l) => l.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">Vlog Lessons ({lessons.length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 bg-[#0891b2] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-cyan-700 transition active:scale-95">
          {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Cancel' : 'Add Lesson'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Episode</label>
              <select value={form.episode_id} onChange={(e) => setForm({ ...form, episode_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 bg-white">
                {episodes.map((ep) => <option key={ep.id} value={ep.id}>Ep {ep.id}: {ep.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lesson #</label>
              <input type="number" min="1" required value={form.lesson_number} onChange={(e) => setForm({ ...form, lesson_number: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video ID</label>
              <input type="text" required placeholder="dQw4w9WgXcQ" value={form.youtube_id} onChange={(e) => setForm({ ...form, youtube_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input type="number" min="1" required value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</div>}
          <button type="submit" disabled={saving} className="w-full bg-[#0891b2] text-white font-semibold py-2.5 rounded-xl hover:bg-cyan-700 transition active:scale-95 disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Lesson'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {lessons.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Video size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No vlog lessons yet. Add one above!</p>
          </div>
        )}
        {lessons.map((lesson, i) => (
          <div key={lesson.id}
            draggable
            onDragStart={() => drag.handleDragStart(i, lesson.id)}
            onDragOver={(e) => drag.handleDragOver(e, i)}
            onDrop={(e) => drag.handleDrop(e, i)}
            onDragEnd={drag.handleDragEnd}
            className={`bg-white rounded-2xl border p-4 flex items-center gap-3 transition-all ${
              drag.dragIndex === i ? 'opacity-40 border-cyan-300' : 'border-gray-100'
            } ${drag.dragOverIndex === i && drag.dragIndex !== i ? 'border-t-2 border-t-cyan-400' : ''}`}
          >
            <DragHandle />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0891b2] to-[#155e75] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {lesson.episode_id}.{lesson.lesson_number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{lesson.title}</p>
              <p className="text-xs text-gray-400 truncate">{lesson.subtitle}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <Clock size={12} /> {lesson.duration_minutes}m
            </span>
            <button onClick={() => handleDelete(lesson.id)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0 flex items-center justify-center">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
