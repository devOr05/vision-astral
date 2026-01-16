'use client';

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
  React.useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('PWA: ServiceWorker registration successful with scope: ', registration.scope);
          },
          (err) => {
            console.log('PWA: ServiceWorker registration failed: ', err);
          }
        );
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.1)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />

      <div className="z-10 flex flex-col items-center gap-8 w-full max-w-5xl">
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tighter text-white">
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
  const [isOnline, setIsOnline] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

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
    <div className="flex flex-col gap-4 w-full max-w-4xl">
      <UpdateNotification />
      <div className="grid grid-cols-3 gap-4 opacity-50">
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
    </div>
  );
}

function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const sw = navigator.serviceWorker;

      const onUpdate = () => {
        setUpdateAvailable(true);
      };

      sw.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // Check if there is already a waiting worker
      sw.getRegistration().then(reg => {
        if (reg?.waiting) onUpdate();
      });
    }
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="w-full p-3 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-between backdrop-blur-md animate-bounce">
      <span className="text-accent text-xs font-mono">NUEVA VERSIÓN ASTRONÁUTICA DISPONIBLE</span>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1 bg-accent text-black text-[10px] font-bold rounded uppercase hover:bg-white transition-colors"
      >
        ACTUALIZAR AHORA
      </button>
    </div>
  );
}
