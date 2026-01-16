import React from 'react';
import dynamic from 'next/dynamic';

const FaceDetector = dynamic(() => import('./components/FaceDetector'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-glass-border bg-black flex items-center justify-center">
      <p className="text-accent font-mono tracking-widest animate-pulse">LOADING MODULES...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.1)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />

      <div className="z-10 flex flex-col items-center gap-8 w-full max-w-5xl">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
            ASTRAL VISION
          </h1>
          <p className="text-accent/60 font-mono text-sm tracking-[0.2em] uppercase">
            Biometric Analysis System v2.0
          </p>
        </header>

        <FaceDetector />

        <ConnectionStatus />
      </div>
    </main>
  );
}

function ConnectionStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-4xl opacity-50">
      <div className="p-4 border border-white/10 rounded bg-white/5 backdrop-blur-sm text-center">
        <div className="text-xs text-gray-400 font-mono mb-1">LATENCY</div>
        <div className="text-accent font-bold">12ms</div>
      </div>
      <div className="p-4 border border-white/10 rounded bg-white/5 backdrop-blur-sm text-center">
        <div className="text-xs text-gray-400 font-mono mb-1">ACCURACY</div>
        <div className="text-accent font-bold">99.8%</div>
      </div>
      <div className="p-4 border border-white/10 rounded bg-white/5 backdrop-blur-sm text-center">
        <div className="text-xs text-gray-400 font-mono mb-1">STATUS</div>
        <div className={`font-bold ${isOnline ? 'text-green-400 animate-pulse' : 'text-red-500'}`}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>
    </div>
  );
}
