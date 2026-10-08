import { Check, Clock, Users } from 'lucide-react';
import { type Profile } from '../lib/supabase';

export default function AdminUserTab({ users }: { users: Profile[] }) {
  return (
    <div>
      <h2 className="font-bold text-gray-900 mb-3">Registered Users ({users.length})</h2>
      <div className="space-y-2">
        {users.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users registered yet.</p>
          </div>
        )}
        {users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-lg flex-shrink-0">{u.avatar_emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{u.display_name}</p>
              <p className="text-xs text-gray-400">{u.hsk_level}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Check size={12} className="text-green-500" /> {u.total_points} pts</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> {new Date(u.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
