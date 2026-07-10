// ScrollFX.jsx
// Small collection of scroll-driven UX primitives used by the CogniAuth
// landing experience: reveal-on-scroll wrapper, a neural scroll-progress
// bar, an animated count-up number and a circular risk gauge.
import React, { useEffect, useRef, useState } from 'react';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Reveal on scroll ─────────────────────────────────────────────── */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (prefersReduced()) { setShown(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ── Scroll state (adds `scrolled` class to <body> past a threshold) ─ */
export function ScrollState({ threshold = 80 }) {
  useEffect(() => {
    const onScroll = () => {
      const el = document.scrollingElement || document.documentElement;
      document.body.classList.toggle('scrolled', el.scrollTop > threshold);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.body.classList.remove('scrolled');
    };
  }, [threshold]);
  return null;
}

/* ── Neural scroll-progress bar (fixed to top of viewport) ────────── */
export function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.scrollingElement || document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setPct(max > 0 ? (el.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Count-up number (animates when scrolled into view) ───────────── */
export function CountUp({ end = 100, duration = 1600, suffix = '', decimals = 0 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) { setVal(end); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(end * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);

  const display = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  return <span ref={ref}>{display}{suffix}</span>;
}

/* ── Circular risk gauge (animated arc) ───────────────────────────── */
export function RiskGauge({ value = 0, size = 132, label = '', color = '#2563eb' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = shown ? circ - (pct / 100) * circ : circ;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { setShown(true); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="risk-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1)' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="risk-gauge-center">
        <div className="risk-gauge-val" style={{ color }}>
          <CountUp end={pct} duration={1400} />
        </div>
        {label && <div className="risk-gauge-lbl">{label}</div>}
      </div>
    </div>
  );
}
