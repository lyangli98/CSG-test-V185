import { useState, type FormEvent } from 'react';
import { Plus, X, Trash2, Megaphone } from 'lucide-react';
import { supabase, type Announcement } from '../lib/supabase';

export default function AdminAnnouncementTab({ announcements, setAnnouncements }: { announcements: Announcement[]; setAnnouncements: (a: Announcement[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', icon: '📢' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iconChoices = ['📢', '🎉', '🔔', '💡', '⚠️', '📚', '✨', '🚀'];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error } = await supabase.from('announcements').insert({ title: form.title, body: form.body, icon: form.icon }).select().single();
    if (error) setError(error.message);
    else if (data) { setAnnouncements([data as Announcement, ...announcements]); setShowForm(false); setForm({ title: '', body: '', icon: '📢' }); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) setAnnouncements(announcements.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">Announcements ({announcements.length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 bg-[#0891b2] text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-cyan-700 transition active:scale-95">
          {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Cancel' : 'New Announcement'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <div className="flex flex-wrap gap-2">
              {iconChoices.map((ic) => (
                <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${form.icon === ic ? 'bg-cyan-50 ring-2 ring-[#0891b2]' : 'bg-gray-50 hover:bg-gray-100'}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea required rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2">{error}</div>}
          <button type="submit" disabled={saving} className="w-full bg-[#0891b2] text-white font-semibold py-2.5 rounded-xl hover:bg-cyan-700 transition active:scale-95 disabled:opacity-50">
            {saving ? 'Sending...' : 'Send Announcement'}
          </button>
        </form>
      )}
      <div className="space-y-2">
        {announcements.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Megaphone size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No announcements yet.</p>
          </div>
        )}
        {announcements.map((ann) => (
          <div key={ann.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-xl flex-shrink-0">{ann.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{ann.body}</p>
              <p className="text-xs text-gray-300 mt-1">{new Date(ann.created_at).toLocaleString()}</p>
            </div>
            <button onClick={() => handleDelete(ann.id)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
