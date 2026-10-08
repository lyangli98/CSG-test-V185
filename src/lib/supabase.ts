import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface Profile {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url: string | null;
  total_points: number;
  streak_days: number;
  last_active_date: string | null;
  created_at: string;
}

export interface Episode {
  id: number;
  title: string;
  subtitle: string;
  sort_order: number;
  unlocked: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  episode_id: number;
  lesson_number: number;
  title: string;
  subtitle: string;
  youtube_id: string;
  duration_minutes: number;
  sort_order: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
  points_earned: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  icon: string;
  created_at: string;
  created_by: string | null;
}

export interface CharLesson {
  id: string;
  episode_id: number;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface CharWord {
  id: string;
  lesson_id: string;
  chinese: string;
  pinyin: string;
  meaning: string;
  image_url: string | null;
  audio_url: string | null;
  sentence_hanzi: string | null;
  sentence_pinyin: string | null;
  sentence_meaning: string | null;
  sentence_audio_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface CharProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  completed_at: string;
}

export interface FinalTest {
  id: string;
  episode_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface FinalTestQuestion {
  id: string;
  test_id: string;
  question_type: 'character' | 'sentence' | 'speaking' | 'vlog';
  question: string;
  chinese: string | null;
  pinyin: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  audio_url: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface WordTile {
  chinese: string;
  pinyin: string;
  audio_url: string | null;
  meaning: string;
}

export interface SlotConfig {
  prefilled: boolean;
  text?: string;
}

export interface SentenceLesson {
  id: string;
  episode_id: number;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface SentenceQuestion {
  id: string;
  lesson_id: string;
  sort_order: number;
  question_type: 'fill_blank' | 'dialogue';
  // preview
  preview_chinese: string | null;
  preview_pinyin: string | null;
  preview_meaning: string | null;
  preview_audio_url: string | null;
  // fill_blank
  sentence_meaning: string | null;
  sentence_audio_url: string | null;
  slot_config: SlotConfig[];
  word_tiles: WordTile[];
  correct_answer?: string[];
  // dialogue
  speaker_a_name: string;
  speaker_a_avatar: string;
  speaker_a_chinese: string | null;
  speaker_a_meaning: string | null;
  speaker_a_audio_url: string | null;
  speaker_b_name: string;
  speaker_b_avatar: string;
  speaker_b_prompt: string | null;
  speaker_b_correct?: string[];
  speaker_b_audio_url: string | null;
  speaker_b_answer_count?: number;
  dialogue_word_tiles: WordTile[];
  created_at: string;
}

export interface SentenceProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}


