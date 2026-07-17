// BrainBackground.jsx
// A human brain rendered as a living neural network on a full-viewport canvas.
// The silhouette is a real anatomical brain outline (an SVG path of the two
// cerebral hemispheres). Neurons (nerve cells) are seeded ONLY inside that
// outline, synapses (nerves) wire nearby neurons together, and electrical
// signal pulses travel along them — so the shape is unmistakably a brain and
// it visibly "thinks". Mouse- and scroll-reactive, kept at low opacity so it
// stays a background. Honors prefers-reduced-motion.
//
// All geometry is computed in device pixels with an identity transform so
// ctx.isPointInPath() lines up exactly with what is drawn.
import React, { useEffect, useRef } from 'react';

// Anatomical brain outline (Font Awesome "brain", viewBox 0 0 576 512).
// Two hemispheres with folds — reads clearly as a human brain.
const BRAIN_PATH =
  'M208 0c-29.9 0-54.7 20.5-61.8 48.2-.8-.1-1.5-.2-2.2-.2-35.3 0-64 28.7-64 64 0 4.8.6 9.5 1.7 14C52.5 138 32 166.6 32 200c0 12.6 3 24.5 8.2 35.1-14.7 13.6-24.2 32.9-24.2 54.7 0 24.5 12.8 45.7 32 58.1V416c0 53 43 96 96 96 29.9 0 54.7-20.5 61.8-48.2.8.1 1.5.2 2.2.2 35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64zm368 200c0-33.4-20.5-62-49.7-73.8 1.1-4.5 1.7-9.2 1.7-14 0-35.3-28.7-64-64-64-.8 0-1.5.1-2.2.2C454.7 20.5 429.9 0 400 0c-35.3 0-64 28.7-64 64v336c0 35.3 28.7 64 64 64 .8 0 1.5-.1 2.2-.2 7.1 27.7 31.9 48.2 61.8 48.2 53 0 96-43 96-96v-9.1c19.2-12.4 32-33.6 32-58.1 0-21.8-9.5-41.1-24.2-54.7 5.2-10.6 8.2-22.5 8.2-35.1z';
const VB_W = 576;
const VB_H = 512;

export default function BrainBackground({ density = 1, interactive = true }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: -99999, y: -99999 });
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const reduceMotion = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    let CW = 0, CH = 0;            // canvas size in device pixels
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let neurons = [];
    let edges = [];
    let signals = [];
    let brainPath = null;         // Path2D of the brain in device px
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let linkDist = 60;
    let running = true;

    const NODE_COLOR = '130, 185, 255';
    const LINK_COLOR = '95, 145, 240';
    const SIGNAL_COLOR = '245, 158, 11';

    // The FontAwesome brain path does not fill its 576x512 viewBox
    // symmetrically, so we measure the path's real bounding box once and
    // center THAT (rather than the viewBox) to place the visible brain dead
    // center. Falls back to the full viewBox if getBBox is unavailable.
    const measurePathBBox = () => {
      try {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.position = 'absolute';
        svg.style.left = '-9999px';
        const p = document.createElementNS(svgNS, 'path');
        p.setAttribute('d', BRAIN_PATH);
        svg.appendChild(p);
        document.body.appendChild(svg);
        const bb = p.getBBox();
        document.body.removeChild(svg);
        if (bb && bb.width > 0 && bb.height > 0) return bb;
      } catch (e) { /* ignore */ }
      return { x: 0, y: 0, width: VB_W, height: VB_H };
    };
    const pathBBox = measurePathBBox();

    const buildBrain = () => {
      // Fit the brain's ACTUAL shape into a large centred box (device px).
      const boxW = Math.min(CW * 0.66, 760 * dpr);
      const boxH = Math.min(CH * 0.78, 680 * dpr);
      const s = Math.min(boxW / pathBBox.width, boxH / pathBBox.height);
      const bw = pathBBox.width * s;
      const bh = pathBBox.height * s;
      // Place so the visible brain center lands at (CW/2, CH*0.47).
      const tx = CW / 2 - (pathBBox.x + pathBBox.width / 2) * s;
      const ty = CH * 0.47 - (pathBBox.y + pathBBox.height / 2) * s;
      box = { x: CW / 2 - bw / 2, y: CH * 0.47 - bh / 2, w: bw, h: bh };
      linkDist = bw * 0.11;

      const raw = new Path2D(BRAIN_PATH);
      const m = new DOMMatrix([s, 0, 0, s, tx, ty]);
      brainPath = new Path2D();
      brainPath.addPath(raw, m);

      seedNeurons();
    };

    const seedNeurons = () => {
      const area = box.w * box.h;
      const target = Math.round(area / (4200 * dpr * dpr));
      const count = Math.max(120, Math.min(280, Math.round(target * density)));

      neurons = [];
      let guard = 0;
      while (neurons.length < count && guard < count * 100) {
        guard++;
        const x = box.x + Math.random() * box.w;
        const y = box.y + Math.random() * box.h;
        if (!ctx.isPointInPath(brainPath, x, y)) continue;
        neurons.push({
          hx: x, hy: y, x, y,
          phase: Math.random() * Math.PI * 2,
          driftA: (2 + Math.random() * 4) * dpr,
          driftS: 0.4 + Math.random() * 0.7,
          r: (Math.random() * 1.3 + 0.9) * dpr,
          pulse: Math.random() * Math.PI * 2,
        });
      }

      edges = [];
      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          const d = Math.hypot(neurons[i].hx - neurons[j].hx, neurons[i].hy - neurons[j].hy);
          if (d < linkDist) edges.push([i, j]);
        }
      }
      signals = [];
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      CW = Math.floor(canvas.clientWidth * dpr);
      CH = Math.floor(canvas.clientHeight * dpr);
      canvas.width = CW;
      canvas.height = CH;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // identity — work in device px
      buildBrain();
    };

    const maybeFireSignal = (rate) => {
      if (reduceMotion) return;
      if (signals.length > 40) return;
      if (Math.random() > rate) return;
      const e = edges[(Math.random() * edges.length) | 0];
      if (!e) return;
      const forward = Math.random() > 0.5;
      signals.push({
        from: forward ? e[0] : e[1],
        to: forward ? e[1] : e[0],
        t: 0,
        speed: 0.012 + Math.random() * 0.022,
      });
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, CW, CH);
      const mouse = mouseRef.current;
      const scroll = scrollRef.current;

      const globalAlpha = Math.max(0.08, 1 - scroll * 0.9);
      const lift = scroll * CH * 0.3;
      ctx.save();
      ctx.translate(0, -lift);
      ctx.globalAlpha = globalAlpha;

      // Brain mass + anatomical outline.
      ctx.fillStyle = `rgba(${NODE_COLOR}, 0.028)`;
      ctx.fill(brainPath);
      ctx.strokeStyle = `rgba(${LINK_COLOR}, 0.4)`;
      ctx.lineWidth = 1.4 * dpr;
      ctx.lineJoin = 'round';
      ctx.stroke(brainPath);

      // Advance neurons (organic wander + cursor push).
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        n.phase += 0.01 * n.driftS;
        n.x = n.hx + Math.cos(n.phase) * n.driftA;
        n.y = n.hy + Math.sin(n.phase * 1.3) * n.driftA;
        if (interactive && mouse.x > -9000) {
          const dx = n.x - mouse.x;
          const dy = n.y - (mouse.y + lift);
          const d = Math.hypot(dx, dy);
          const reach = 120 * dpr;
          if (d < reach && d > 0.01) {
            const force = (reach - d) / reach * 9 * dpr;
            n.x += (dx / d) * force;
            n.y += (dy / d) * force;
          }
        }
      }

      // Nerves (synapses).
      const maxD = linkDist * 1.3;
      for (let k = 0; k < edges.length; k++) {
        const a = neurons[edges[k][0]];
        const b = neurons[edges[k][1]];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist > maxD) continue;
        const alpha = (1 - dist / maxD) * 0.4;
        ctx.strokeStyle = `rgba(${LINK_COLOR}, ${alpha})`;
        ctx.lineWidth = 0.9 * dpr;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Cursor attention halo.
      if (interactive && mouse.x > -9000) {
        const my = mouse.y + lift;
        const reach = 150 * dpr;
        for (let i = 0; i < neurons.length; i++) {
          const n = neurons[i];
          const dm = Math.hypot(n.x - mouse.x, n.y - my);
          if (dm < reach) {
            const alpha = (1 - dm / reach) * 0.5;
            ctx.strokeStyle = `rgba(${SIGNAL_COLOR}, ${alpha})`;
            ctx.lineWidth = 0.9 * dpr;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(mouse.x, my);
            ctx.stroke();
          }
        }
      }

      // Neurons (nerve cells) with a breathing glow.
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        n.pulse += 0.02;
        const glow = (Math.sin(n.pulse) + 1) * 0.5;
        const r = n.r + glow * 0.7 * dpr;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${NODE_COLOR}, ${0.04 + glow * 0.04})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${NODE_COLOR}, ${0.5 + glow * 0.4})`;
        ctx.fill();
      }

      // Signal pulses travelling along the nerves.
      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.t += s.speed;
        if (s.t >= 1) { signals.splice(i, 1); continue; }
        const from = neurons[s.from];
        const to = neurons[s.to];
        if (!from || !to) { signals.splice(i, 1); continue; }
        const x = from.x + (to.x - from.x) * s.t;
        const y = from.y + (to.y - from.y) * s.t;
        ctx.strokeStyle = `rgba(${SIGNAL_COLOR}, 0.3)`;
        ctx.lineWidth = 1.3 * dpr;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.3 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${SIGNAL_COLOR}, 0.9)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 5.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${SIGNAL_COLOR}, 0.16)`;
        ctx.fill();
      }

      ctx.restore();

      maybeFireSignal(0.06 + scroll * 0.12);
      rafRef.current = requestAnimationFrame(draw);
    };

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: (e.clientX - rect.left) * dpr, y: (e.clientY - rect.top) * dpr };
    };
    const onMouseLeave = () => { mouseRef.current = { x: -99999, y: -99999 }; };
    const onScroll = () => {
      const el = document.scrollingElement || document.documentElement;
      const vh = el.clientHeight || window.innerHeight || 1;
      scrollRef.current = Math.max(0, Math.min(1.4, el.scrollTop / vh));
    };

    resize();
    onScroll();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (interactive) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseleave', onMouseLeave);
    }

    if (reduceMotion) {
      draw();
      running = false;
      cancelAnimationFrame(rafRef.current);
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [density, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="neural-canvas brain-canvas"
      aria-hidden="true"
    />
  );
}
