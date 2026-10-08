import { Snowflake } from 'lucide-react';

/**
 * Atmospheric Arctic background for the leaderboard:
 * aurora sky, distant ice mountains, snowfall, and floating ice crystals.
 * Matches the repo reference design style.
 */
export default function LeaderboardScene() {
  const flakes = Array.from({ length: 10 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i * 0.7) % 4,
    duration: 6 + (i % 4),
    size: 6 + (i % 3) * 2,
  }));

  const crystals = Array.from({ length: 5 }, (_, i) => ({
    left: 10 + (i * 23) % 80,
    top: 15 + (i * 31) % 55,
    delay: (i * 1.3) % 4,
    size: 8 + (i % 3) * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Aurora sky — three soft drifting radial glows */}
      <div
        className="absolute -top-8 left-[18%] w-40 h-28 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(ellipse, rgba(34,211,238,0.14), transparent 70%)',
          animation: 'aurora-shift 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-2 right-[18%] w-48 h-32 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.08), transparent 70%)',
          animation: 'aurora-shift 10s ease-in-out infinite 2s',
        }}
      />
      <div
        className="absolute top-8 left-1/3 w-36 h-24 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.06), transparent 70%)',
          animation: 'aurora-shift 12s ease-in-out infinite 1s',
        }}
      />

      {/* Distant ice mountains */}
      <svg
        className="absolute bottom-0 left-0 w-full h-20 pointer-events-none"
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M0,80 L35,40 L65,58 L100,22 L140,48 L180,15 L220,42 L260,28 L300,52 L340,20 L380,45 L400,35 L400,80 Z" fill="rgba(186,230,253,0.07)" />
        <path d="M0,80 L45,55 L85,68 L125,38 L165,60 L205,32 L245,55 L290,42 L330,62 L380,38 L400,50 L400,80 Z" fill="rgba(125,211,252,0.05)" />
      </svg>

      {/* Snowfall */}
      {flakes.map((f, i) => (
        <Snowflake
          key={i}
          size={f.size}
          className="absolute text-white"
          style={{
            left: `${f.left}%`,
            top: '-20px',
            opacity: 0.5,
            animation: `snowfall ${f.duration}s linear infinite`,
            animationDelay: `${f.delay}s`,
          }}
        />
      ))}

      {/* Floating ice crystals */}
      {crystals.map((c, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${c.left}%`,
            top: `${c.top}%`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(186,230,253,0.06))',
            border: '1px solid rgba(255,255,255,0.08)',
            transform: 'rotate(45deg)',
            animation: `crystal-float ${5 + i}s ease-in-out infinite`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
