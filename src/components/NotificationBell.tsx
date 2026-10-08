import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, type Announcement } from '../lib/supabase';

export default function NotificationBell() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [{ data: annData }, { data: readData }] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('announcement_reads').select('announcement_id').eq('user_id', user.id),
      ]);
      setAnnouncements(annData ?? []);
      setReadIds(new Set((readData ?? []).map((r) => r.announcement_id)));
      setLoading(false);
    }
    loadData();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAllRead() {
    if (!user) return;
    const unread = announcements.filter((a) => !readIds.has(a.id));
    if (unread.length === 0) return;
    await supabase.from('announcement_reads').insert(
      unread.map((a) => ({ user_id: user.id, announcement_id: a.id }))
    );
    setReadIds(new Set(announcements.map((a) => a.id)));
  }

  async function toggleOpen() {
    if (!open && announcements.some((a) => !readIds.has(a.id))) {
      await markAllRead();
    }
    setOpen(!open);
  }

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition active:scale-90"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-premium-lg border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-[#0891b2] font-semibold">{unreadCount} new</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                <Bell size={24} className="mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            ) : (
              announcements.map((ann) => {
                const isUnread = !readIds.has(ann.id);
                return (
                  <div
                    key={ann.id}
                    className={`px-4 py-3 border-b border-gray-50 last:border-0 ${isUnread ? 'bg-cyan-50/50' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg flex-shrink-0">{ann.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ann.body}</p>
                        <p className="text-xs text-gray-300 mt-1">{new Date(ann.created_at).toLocaleString()}</p>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-[#0891b2] flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
