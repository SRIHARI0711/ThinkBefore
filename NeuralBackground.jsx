// NeuralBackground.jsx
// A living neural-network canvas: neurons, synapses and traveling signal
// pulses that visualise the "brain in the background" powering CogniAuth's
// real-time decision reasoning. Lightweight, mouse-reactive and fully
// respectful of prefers-reduced-motion.
import React, { useEffect, useRef } from 'react';

export default function NeuralBackground({ density = 1, interactive = true }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const reduceMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let neurons = [];
    let signals = [];
    let running = true;

    // Colour palette tuned to the CogniAuth brand (blues + a touch of amber).
    const NODE_COLOR = '99, 160, 255';
    const LINK_COLOR = '80, 130, 230';
    const SIGNAL_COLOR = '245, 158, 11';

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNeurons();
    };

    const buildNeurons = () => {
      // Node count scales with viewport area, capped for performance.
      const base = Math.round((width * height) / 26000);
      const count = Math.max(26, Math.min(90, Math.round(base * density)));
      neurons = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.8 + 1.1,
        pulse: Math.random() * Math.PI * 2,
      }));
      signals = [];
    };

    const LINK_DIST = 150; // px – neurons closer than this are "connected"

    // Occasionally fire a signal pulse from one neuron toward a connected one.
    const maybeFireSignal = () => {
      if (reduceMotion) return;
      if (signals.length > 22) return;
      if (Math.random() > 0.06) return;
      const a = neurons[(Math.random() * neurons.length) | 0];
      if (!a) return;
      // Find a nearby neuron to send the signal to.
      let best = null;
      let bestD = LINK_DIST;
      for (let i = 0; i < neurons.length; i++) {
        const b = neurons[i];
        if (b === a) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < bestD && Math.random() > 0.5) { best = b; bestD = d; }
      }
      if (best) signals.push({ from: a, to: best, t: 0, speed: 0.012 + Math.random() * 0.02 });
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      const mouse = mouseRef.current;

      // 1. Draw synapse links between nearby neurons.
      for (let i = 0; i < neurons.length; i++) {
        const a = neurons[i];
        for (let j = i + 1; j < neurons.length; j++) {
          const b = neurons[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.5;
            ctx.strokeStyle = `rgba(${LINK_COLOR}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Mouse "attention" halo – links from cursor to nearby neurons.
        if (interactive && mouse.x > -9000) {
          const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (dm < 190) {
            const alpha = (1 - dm / 190) * 0.55;
            ctx.strokeStyle = `rgba(${SIGNAL_COLOR}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      // 2. Draw neurons with a soft breathing glow.
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        n.pulse += 0.02;
        const glow = (Math.sin(n.pulse) + 1) * 0.5;
        const r = n.r + glow * 0.9;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${NODE_COLOR}, ${0.45 + glow * 0.4})`;
        ctx.fill();
        // Halo
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${NODE_COLOR}, ${0.05 + glow * 0.05})`;
        ctx.fill();
      }

      // 3. Draw traveling signal pulses along synapses.
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.t += s.speed;
        if (s.t >= 1) { signals.splice(i, 1); continue; }
        const x = s.from.x + (s.to.x - s.from.x) * s.t;
        const y = s.from.y + (s.to.y - s.from.y) * s.t;
        // Faint trail
        ctx.strokeStyle = `rgba(${SIGNAL_COLOR}, 0.35)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.from.x, s.from.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        // Bright head
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${SIGNAL_COLOR}, 0.95)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${SIGNAL_COLOR}, 0.2)`;
        ctx.fill();
      }

      // 4. Advance neuron positions.
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Gentle cursor repulsion for an interactive, "thinking" feel.
        if (interactive && mouse.x > -9000) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 120 && d > 0.01) {
            const force = (120 - d) / 120 * 0.6;
            n.x += (dx / d) * force;
            n.y += (dy / d) * force;
          }
        }
      }

      maybeFireSignal();
      rafRef.current = requestAnimationFrame(draw);
    };

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    resize();
    window.addEventListener('resize', resize);
    if (interactive) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseleave', onMouseLeave);
    }

    if (reduceMotion) {
      // Draw a single static frame – no continuous animation.
      draw();
      running = false;
      cancelAnimationFrame(rafRef.current);
      // Re-render one clean static frame after cancel.
      ctx.clearRect(0, 0, width, height);
      running = true;
      draw();
      running = false;
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [density, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="neural-canvas"
      aria-hidden="true"
    />
  );
}
