import { useState, type FormEvent } from 'react';
import { Layers, Plus, X, Check, Pencil, Trash2 } from 'lucide-react';
import { supabase, type Episode } from '../lib/supabase';
import { useDragReorder } from '../lib/useDragReorder';
import DragHandle from './DragHandle';

export default function AdminEpisodeTab({ episodes, setEpisodes }: { episodes: Episode[]; setEpisodes: (e: Episode[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', title: '', subtitle: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', subtitle: '' });

  const drag = useDragReorder(episodes, (newEps: Episode[]) => {
    setEpisodes(newEps);
    persistEpisodeOrder(newEps);
  });

  async function persistEpisodeOrder(eps: Episode[]) {
    eps.forEach((ep, i) => {
      if (ep.sort_order !== i) supabase.from('episodes').update({ sort_order: i }).eq('id', ep.id).then();
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const nextId = episodes.length > 0 ? Math.max(...episodes.map((ep) => ep.id)) + 1 : 1;
    const { data, error } = await supabase.from('episodes').insert({
      id: form.id ? Number(form.id) : nextId,
      title: form.title,
      subtitle: form.subtitle,
      sort_order: episodes.length,
      unlocked: false,
    }).select().single();
    if (error) setError(error.message);
    else if (data) {
      setEpisodes([...episodes, data as Episode]);
      setShowForm(false);
      setForm({ id: '', title: '', subtitle: '' });
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this episode? Lessons and tests for this episode will also be removed.')) return;
    const { error } = await supabase.from('episodes').delete().eq('id', id);
    if (!error) setEpisodes(episodes.filter((ep) => ep.id !== id));
  }

  function startEdit(ep: Episode) {
    setEditingId(ep.id);
    setEditForm({ title: ep.title, subtitle: ep.subtitle });
  }

  async function saveEdit(id: number) {
    const { error } = await supabase.from('episodes').update({ title: editForm.title, subtitle: editForm.subtitle }).eq('id', id);
    if (!error) {
      setEpisodes(episodes.map((ep) => (ep.id === id ? { ...ep, title: editForm.title, subtitle: editForm.subtitle } : ep)));
      setEditingId(null);
    }
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-[#0891b2] to-[#155e75] rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Episodes</h2>
            <p className="text-xs text-cyan-200/70">Drag to reorder. Edit titles and subtitles. These define the course structure.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">All Episodes ({episodes.length})</h3>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 bg-[#0891b2] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-cyan-700 transition active:scale-95">
          {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Cancel' : 'Add Episode'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID (optional)</label>
              <input type="number" min="1" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="Auto" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Basics" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
            <input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Introduction to Chinese" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</div>}
          <button type="submit" disabled={saving} className="w-full bg-[#0891b2] text-white font-semibold py-2.5 rounded-xl hover:bg-cyan-700 transition active:scale-95 disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Episode'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {episodes.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Layers size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No episodes yet. Add one to get started!</p>
          </div>
        )}
        {episodes.map((ep, i) => (
          <div key={ep.id}
            draggable
            onDragStart={() => drag.handleDragStart(i, String(ep.id))}
            onDragOver={(e) => drag.handleDragOver(e, i)}
            onDrop={(e) => drag.handleDrop(e, i)}
            onDragEnd={drag.handleDragEnd}
            className={`bg-white rounded-2xl border p-4 flex items-center gap-3 transition-all ${
              drag.dragIndex === i ? 'opacity-40 border-cyan-300' : 'border-gray-100'
            } ${drag.dragOverIndex === i && drag.dragIndex !== i ? 'border-t-2 border-t-cyan-400' : ''}`}
          >
            <DragHandle />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0891b2] to-[#155e75] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {ep.id}
            </div>
            {editingId === ep.id ? (
              <div className="flex-1 min-w-0 space-y-1.5">
                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-semibold" />
                <input type="text" value={editForm.subtitle} onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-xs" />
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{ep.title}</p>
                <p className="text-xs text-gray-400 truncate">{ep.subtitle}</p>
              </div>
            )}
            {editingId === ep.id ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => saveEdit(ep.id)} className="w-8 h-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition flex items-center justify-center">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 transition flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => startEdit(ep)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-cyan-50 hover:text-[#0891b2] transition flex items-center justify-center">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(ep.id)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
