// Brain3DBackground.jsx
// Entry point for the persistent 3D brain background layer.
//
// The actual three.js scene (Brain3D.jsx) is code-split behind React.lazy so
// the three/@react-three bundles never block first paint. Before loading it
// we probe the environment: users with prefers-reduced-motion, machines
// without WebGL and low-end devices (few cores / little RAM / coarse pointer
// with a small screen) get the previous lightweight 2D-canvas brain
// (BrainBackground) instead — which itself renders a single static frame
// under reduced motion. Content never depends on either layer; both are
// aria-hidden, pointer-events:none decorations.
import React, { lazy, Suspense, useEffect, useState } from 'react';
import BrainBackground from './BrainBackground.jsx';

const Brain3D = lazy(() => import('./Brain3D.jsx'));

function detectMode() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'lite';
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 'lite';
    const cores = navigator.hardwareConcurrency || 8;
    const mem = navigator.deviceMemory || 8;
    const smallCoarse =
      window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 820;
    if (cores <= 2 || mem <= 2 || smallCoarse) return 'lite';
    return '3d';
  } catch (e) {
    return 'lite';
  }
}

export default function Brain3DBackground() {
  const [mode, setMode] = useState(null);

  // Defer the probe (and with it the dynamic import) past first paint.
  useEffect(() => {
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback.bind(window)
      : (cb) => setTimeout(cb, 200);
    const cancel = window.cancelIdleCallback
      ? window.cancelIdleCallback.bind(window)
      : clearTimeout;
    const id = idle(() => setMode(detectMode()));
    return () => cancel(id);
  }, []);

  if (mode === null) return null;
  if (mode === 'lite') return <BrainBackground density={1} interactive={true} />;
  return (
    <Suspense fallback={null}>
      <Brain3D />
    </Suspense>
  );
}
