export interface Episode {
  id: number;
  title: string;
  subtitle: string;
  unlocked: boolean;
}

export const EPISODES: Episode[] = [
  { id: 1, title: 'Basics', subtitle: 'Introduction to Chinese', unlocked: true },
  { id: 2, title: 'Greetings', subtitle: 'Common phrases', unlocked: false },
  { id: 3, title: 'Numbers', subtitle: 'Counting in Chinese', unlocked: false },
  { id: 4, title: 'Family', subtitle: 'Family members vocabulary', unlocked: false },
  { id: 5, title: 'Food & Drink', subtitle: 'Ordering at a restaurant', unlocked: false },
  { id: 6, title: 'Travel', subtitle: 'Getting around China', unlocked: false },
];

export function getEpisodeById(id: number): Episode | undefined {
  return EPISODES.find((ep) => ep.id === id);
}
