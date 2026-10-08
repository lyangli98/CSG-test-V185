export interface LeaderEntry {
  rank: number;
  name: string;
  level: string;
  score: number;
  avatar: string;
  isUser?: boolean;
  trend: 'up' | 'down' | 'same';
}

export const LEADERBOARD: LeaderEntry[] = [
  { rank: 1, name: '李明', level: 'HSK 5', score: 9850, avatar: '👑', trend: 'same' },
  { rank: 2, name: '王芳', level: 'HSK 5', score: 9720, avatar: '⭐', trend: 'up' },
  { rank: 3, name: '张伟', level: 'HSK 4', score: 9650, avatar: '🌟', trend: 'down' },
  { rank: 4, name: 'You', level: 'HSK 4', score: 8920, avatar: '🎯', isUser: true, trend: 'up' },
  { rank: 5, name: '刘娜', level: 'HSK 4', score: 8850, avatar: '🔄', trend: 'down' },
  { rank: 6, name: '陈杰', level: 'HSK 4', score: 8720, avatar: '✨', trend: 'same' },
  { rank: 7, name: '赵敏', level: 'HSK 3', score: 8650, avatar: '🌸', trend: 'up' },
  { rank: 8, name: '孙丽', level: 'HSK 3', score: 8580, avatar: '🎨', trend: 'down' },
];
