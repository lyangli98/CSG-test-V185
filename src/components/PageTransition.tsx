import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

type Direction = 'forward' | 'back' | 'none';

const FORWARD_PATTERNS: RegExp[] = [
  /^\/episode\/[^/]+$/, // episode detail
  /^\/episode\/[^/]+\/activity\//, // activity list
  /^\/episode\/[^/]+\/activity\/[^/]+\/lesson\//, // lesson
  /^\/lesson\//, // standalone lesson
  /^\/welcome$/, // dashboard
  /^\/profile$/,
  /^\/admin$/,
  /^\/leaderboard$/,
];

function classify(pathname: string): number {
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return 0;
  for (let i = 0; i < FORWARD_PATTERNS.length; i++) {
    if (FORWARD_PATTERNS[i].test(pathname)) return i + 1;
  }
  return 0;
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prevDepth = useRef(classify(location.pathname));
  const [dir, setDir] = useState<Direction>('none');

  useEffect(() => {
    const depth = classify(location.pathname);
    if (depth > prevDepth.current) setDir('forward');
    else if (depth < prevDepth.current) setDir('back');
    else setDir('none');
    prevDepth.current = depth;
  }, [location.pathname]);

  const cls =
    dir === 'forward' ? 'page-transition-right'
    : dir === 'back' ? 'page-transition-left'
    : 'page-transition';

  return (
    <div key={location.pathname} className={`${cls} no-overflow-x`}>
      {children}
    </div>
  );
}
