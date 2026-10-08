import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, BookOpen, Megaphone, Users, Layers, FlaskConical, FileText, AlignLeft, Mic, Video } from 'lucide-react';
import { supabase, type Lesson, type Announcement, type Profile, type CharLesson, type FinalTest, type Episode } from '../lib/supabase';
import AdminEpisodeTab from '../components/AdminEpisodeTab';
import AdminTestTab from '../components/AdminTestTab';
import AdminLessonTab from '../components/AdminLessonTab';
import AdminAnnouncementTab from '../components/AdminAnnouncementTab';
import AdminUserTab from '../components/AdminUserTab';
import AdminCharWordTab from '../components/AdminCharWordTab';
import AdminSentenceTab from '../components/AdminSentenceTab';

type LessonSub = 'lesson-character' | 'lesson-sentence' | 'lesson-vlog' | 'lesson-speaking';
type RootTab   = 'episodes' | 'test' | 'lesson' | 'announcements' | 'users';

const LESSON_ITEMS: { key: LessonSub; label: string; icon: typeof FileText; color: string }[] = [
  { key: 'lesson-character', label: 'Character Test',       icon: FileText,  color: 'text-[#0891b2]' },
  { key: 'lesson-sentence',  label: 'Sentence Journey',     icon: AlignLeft, color: 'text-emerald-600' },
  { key: 'lesson-vlog',      label: 'Watch Vlog',           icon: Video,     color: 'text-purple-600' },
  { key: 'lesson-speaking',  label: 'Speaking Test',        icon: Mic,       color: 'text-rose-500' },
];

export default function AdminView() {
  const [rootTab, setRootTab] = useState<RootTab>('episodes');
  const [lessonSub, setLessonSub] = useState<LessonSub>('lesson-character');

  const [episodes,      setEpisodes]      = useState<Episode[]>([]);
  const [lessons,       setLessons]      = useState<Lesson[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [users,         setUsers]         = useState<Profile[]>([]);
  const [charLessons,   setCharLessons]   = useState<CharLesson[]>([]);
  const [finalTests,    setFinalTests]    = useState<FinalTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [{ data: ep }, { data: ld }, { data: ad }, { data: ud }, { data: cd }, { data: ft }] = await Promise.all([
        supabase.from('episodes').select('*').order('sort_order'),
        supabase.from('lessons').select('*').order('episode_id').order('sort_order'),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('char_lessons').select('*').order('episode_id').order('sort_order'),
        supabase.from('final_tests').select('*').order('episode_id').order('sort_order'),
      ]);
      setEpisodes(ep ?? []);
      setLessons(ld ?? []);
      setAnnouncements(ad ?? []);
      setUsers(ud ?? []);
      setCharLessons(cd ?? []);
      setFinalTests(ft ?? []);
      setLoading(false);
    }
    loadData();
  }, []);

  const lessonActive = rootTab === 'lesson';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-10">
      <Link to="/welcome" className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-premium-sm rounded-full pl-2.5 pr-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-premium-sm transition-all active:scale-95 mb-4">
        <span className="w-6 h-6 rounded-full bg-[#0891b2] flex items-center justify-center">
          <ChevronLeft size={14} className="text-white" strokeWidth={2.5} />
        </span>
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
          <BookOpen size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Manage content and monitor users</p>
        </div>
      </div>

      {/* ── Primary tab bar ── */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button onClick={() => setRootTab('episodes')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition flex-shrink-0 ${
            rootTab === 'episodes' ? 'bg-[#0891b2] text-white shadow-premium-blue shadow-cyan-500/10' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
          }`}>
          <Layers size={16} />
          Episodes
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${rootTab === 'episodes' ? 'bg-white/20' : 'bg-gray-100'}`}>{episodes.length}</span>
        </button>

        <button onClick={() => setRootTab('test')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition flex-shrink-0 ${
            rootTab === 'test' ? 'bg-[#0891b2] text-white shadow-premium-blue shadow-cyan-500/10' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
          }`}>
          <FlaskConical size={16} />
          Test
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${rootTab === 'test' ? 'bg-white/20' : 'bg-gray-100'}`}>{finalTests.length}</span>
        </button>

        <button onClick={() => setRootTab('lesson')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition flex-shrink-0 ${
            lessonActive ? 'bg-[#0891b2] text-white shadow-premium-blue shadow-cyan-500/10' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
          }`}>
          <BookOpen size={16} />
          Lesson
        </button>

        <button onClick={() => setRootTab('announcements')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition flex-shrink-0 ${
            rootTab === 'announcements' ? 'bg-[#0891b2] text-white shadow-premium-blue shadow-cyan-500/10' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
          }`}>
          <Megaphone size={16} />
          Announcements
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${rootTab === 'announcements' ? 'bg-white/20' : 'bg-gray-100'}`}>{announcements.length}</span>
        </button>

        <button onClick={() => setRootTab('users')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition flex-shrink-0 ${
            rootTab === 'users' ? 'bg-[#0891b2] text-white shadow-premium-blue shadow-cyan-500/10' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
          }`}>
          <Users size={16} />
          Users
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${rootTab === 'users' ? 'bg-white/20' : 'bg-gray-100'}`}>{users.length}</span>
        </button>
      </div>

      {/* ── Activity sub-tabs (visible only when Lesson is active) ── */}
      {lessonActive && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {LESSON_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = lessonSub === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setLessonSub(item.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition flex-shrink-0 ${
                  active
                    ? 'bg-gray-900 text-white shadow-premium-sm'
                    : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} className={active ? 'text-white' : item.color} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : rootTab === 'episodes' ? (
        <AdminEpisodeTab episodes={episodes} setEpisodes={setEpisodes} />
      ) : rootTab === 'test' ? (
        <AdminTestTab episodes={episodes} finalTests={finalTests} setFinalTests={setFinalTests} />
      ) : rootTab === 'lesson' ? (
        lessonSub === 'lesson-character'
          ? <AdminCharWordTab episodes={episodes} charLessons={charLessons} setCharLessons={setCharLessons} />
          : lessonSub === 'lesson-vlog'
          ? <AdminLessonTab episodes={episodes} lessons={lessons} setLessons={setLessons} />
          : lessonSub === 'lesson-sentence'
          ? <AdminSentenceTab episodes={episodes} />
          : <ComingSoonTab label="Speaking Test Lessons" icon={Mic} color="text-rose-500" bg="bg-rose-50" />
      ) : rootTab === 'announcements' ? (
        <AdminAnnouncementTab announcements={announcements} setAnnouncements={setAnnouncements} />
      ) : (
        <AdminUserTab users={users} />
      )}
    </div>
  );
}

function ComingSoonTab({ label, icon: Icon, color, bg }: { label: string; icon: typeof FileText; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-3xl border border-gray-100 p-12 text-center`}>
      <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-premium-sm">
        <Icon size={30} className={color} />
      </div>
      <h3 className="font-extrabold text-gray-800 text-lg mb-1">{label}</h3>
      <p className="text-sm text-gray-400">This section is coming soon. Stay tuned!</p>
    </div>
  );
}
