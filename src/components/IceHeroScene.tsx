import { useMemo } from 'react';

/**
 * Soft, cozy hero background for the welcome card.
 * Blurred depth circles, subtle gradient washes, a few tiny floating particles,
 * and a very faint Chinese cloud (祥云) pattern. No snowflakes, no busy decorations.
 */
export default function IceHeroScene() {
  const particles = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: 10 + Math.random() * 70,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 6,
        duration: 9 + Math.random() * 7,
        drift: (Math.random() - 0.5) * 30,
        opacity: 0.25 + Math.random() * 0.3,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base gradient wash — fades naturally into the card's blue */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 80% 100%, rgba(14,116,144,0.55) 0%, rgba(8,145,178,0.25) 35%, rgba(7,89,133,0.08) 60%, transparent 80%)',
        }}
      />

      {/* Soft depth — blurred circles */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{ width: '45%', height: '60%', top: '-10%', left: '-8%', background: 'radial-gradient(circle, rgba(125,211,252,0.22) 0%, transparent 70%)' }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{ width: '38%', height: '50%', bottom: '-12%', left: '18%', background: 'radial-gradient(circle, rgba(94,234,212,0.16) 0%, transparent 70%)' }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{ width: '30%', height: '40%', top: '5%', right: '8%', background: 'radial-gradient(circle, rgba(186,230,253,0.18) 0%, transparent 70%)' }}
      />

      {/* Very faint Chinese cloud (祥云) pattern — bottom right behind mascot */}
      <svg
        className="absolute"
        style={{ bottom: '-6%', right: '2%', width: '52%', height: '62%', opacity: 0.07 }}
        viewBox="0 0 200 200"
        fill="none"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <pattern id="cloudpat" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M40 50 a14 14 0 0 1 14-14 a12 12 0 0 1 12 8 a10 10 0 0 1 10 6 a9 9 0 0 1 -9 9 h-27 a9 9 0 0 1 -9 -9 a10 10 0 0 1 10 -6 a12 12 0 0 1 12 -8"
              fill="none"
              stroke="white"
              strokeWidth="1.4"
            />
            <path d="M40 50 q-6 0 -6 6 M58 50 q6 0 6 6" fill="none" stroke="white" strokeWidth="1.4" />
          </pattern>
        </defs>
        <rect width="200" height="200" fill="url(#cloudpat)" />
      </svg>

      {/* Subtle top highlight for depth */}
      <div
        className="absolute inset-x-0 top-0 h-1/3"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, transparent 100%)' }}
      />

      {/* Tiny floating particles — gentle, sparse */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(207,250,254,0.9)',
            opacity: p.opacity,
            filter: 'blur(0.5px)',
            animation: `particle-float ${p.duration}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s`,
            ['--p-drift' as string]: `${p.drift}px`,
          }}
        />
      ))}

      {/* Soft ground glow where the mascot sits — anchors it to the bottom */}
      <div
        className="absolute bottom-0 right-0"
        style={{
          width: '55%',
          height: '30%',
          background: 'radial-gradient(60% 100% at 70% 100%, rgba(125,211,252,0.18) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
