import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupView() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/welcome');
    }
  }

  const chars = ['学', '习', '语', '文', '字', '道'];

  return (
    <div className="min-h-screen flex">
      {/* Left visual panel */}
      <div className="hidden lg:flex w-1/2 relative gradient-animated bg-gradient-to-br from-[#0891b2] via-[#0e7490] to-[#155e75] overflow-hidden">
        <div className="mesh-blob w-96 h-96 bg-cyan-400/30 top-0 right-0" />
        <div className="mesh-blob w-72 h-72 bg-cyan-300/20 bottom-0 left-1/4" style={{ animationDelay: '2s' }} />
        <div className="mesh-blob w-56 h-56 bg-sky-400/20 top-1/3 left-0" style={{ animationDelay: '4s' }} />

        {chars.map((c, i) => (
          <span
            key={i}
            className="float-char absolute text-white/10 font-black select-none pointer-events-none"
            style={{ fontSize: `${48 + (i % 3) * 24}px`, top: `${10 + (i * 14) % 70}%`, left: `${5 + (i * 17) % 85}%`, animationDelay: `${i * 0.5}s` }}
          >
            {c}
          </span>
        ))}

        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link to="/" className="flex items-center gap-3 mb-12 group">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <span className="text-white font-extrabold text-xl">C</span>
            </div>
            <span className="font-extrabold text-2xl text-white">CSG</span>
          </Link>

          <h1 className="anim-slide-up text-4xl font-extrabold text-white leading-tight mb-4">
            Start your Chinese<br />learning adventure
          </h1>
          <p className="anim-slide-up stagger-2 text-cyan-100 text-lg max-w-sm leading-relaxed">
            Join CSG and learn Chinese through immersive vlog-style lessons. Step by step, character by character.
          </p>

          <div className="anim-slide-up stagger-4 mt-12 space-y-3">
            {[
              { t: 'Vlog-based learning', d: 'Real-world context' },
              { t: 'Character mastery', d: 'Stroke by stroke' },
              { t: 'Track your progress', d: 'Stay motivated' },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-300 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold text-sm">{f.t}</p>
                  <p className="text-cyan-200/70 text-xs">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0891b2] to-[#155e75] flex items-center justify-center">
                <span className="text-white font-extrabold text-xl">C</span>
              </div>
              <span className="font-extrabold text-2xl text-gray-900">CSG</span>
            </Link>
          </div>

          <div className="anim-panel-in">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 mt-1 mb-6">Your email must be allowlisted by an admin</p>
          </div>

          <div className="bg-white rounded-2xl shadow-premium-sm border border-gray-100 p-6 sm:p-8 anim-panel-in stagger-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="anim-slide-in">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all hover:border-gray-300"
                  placeholder="you@example.com"
                />
              </div>
              <div className="anim-slide-in stagger-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all hover:border-gray-300"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-[#0891b2] transition"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 anim-slide-in" style={{ animation: 'shake 0.4s' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flood-btn w-full py-3 rounded-xl bg-gradient-to-r from-[#0891b2] to-[#0e7490] text-white font-semibold shadow-premium-blue shadow-cyan-500/10 hover:shadow-cyan-500/10 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0891b2] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <Link to="/" className="block text-center text-sm text-gray-400 mt-6 hover:text-gray-600 transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
