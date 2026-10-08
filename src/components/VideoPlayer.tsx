import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw } from 'lucide-react';

interface VideoPlayerProps {
  youtubeId: string;
  title?: string;
}

export default function VideoPlayer({ youtubeId, title }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [started, setStarted] = useState(false);

  const src = `https://www.youtube.com/embed/${youtubeId}?` + [
    'rel=0',
    'modestbranding=1',
    'controls=0',
    'showinfo=0',
    'iv_load_policy=3',
    'fs=0',
    'disablekb=1',
    'playsinline=1',
    'cc_load_policy=0',
    'origin=' + encodeURIComponent(window.location.origin),
  ].join('&');

  const postMessage = useCallback((action: string, args?: unknown[]) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: action, args: args ?? [] }),
      '*'
    );
  }, []);

  function handlePlay() {
    if (!started) setStarted(true);
    postMessage('playVideo');
    setPlaying(true);
  }

  function handlePause() {
    postMessage('pauseVideo');
    setPlaying(false);
  }

  function handleToggleMute() {
    if (muted) {
      postMessage('unMute');
      setMuted(false);
    } else {
      postMessage('mute');
      setMuted(true);
    }
  }

  function handleRestart() {
    postMessage('seekTo', ['0', true] as unknown[]);
    postMessage('playVideo');
    setPlaying(true);
  }

  function handleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(true)}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title={title || 'Video player'}
        className="absolute inset-0 w-full h-full pointer-events-none"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        frameBorder="0"
      />

      {!started && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0891b2]/90 to-[#155e75]/90 z-10 transition-opacity hover:opacity-90"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/30 group-hover:scale-110 transition-transform">
            <Play size={36} className="text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {started && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-3 flex items-center gap-3 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={playing ? handlePause : handlePlay}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            {playing ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
          </button>

          <button
            onClick={handleToggleMute}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={handleRestart}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <RotateCcw size={18} />
          </button>

          <div className="flex-1" />

          <button
            onClick={handleFullscreen}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
