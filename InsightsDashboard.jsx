// InsightsDashboard.jsx
// The "Insights" view for CogniAuth. Derives everything from the in-memory
// `history` array (already loaded from MongoDB) — no extra API calls. Standard
// charts use Recharts; the Impulse Heatmap and Streak Calendar are hand-built
// SVG grids. Colors come from the app's palette (mirrors the CSS variables so
// Recharts gets concrete values), and the layout uses the Outfit/Syne stack.
import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

/* ── Palette (accent colors are identical in light/dark) ──────────── */
const RISK_COLORS = { critical: '#ef4444', high: '#f59e0b', medium: '#2563eb', low: '#10b981' };
const CATEGORY_COLORS = {
  financial: '#f59e0b', investments: '#d97706',
  career: '#2563eb', education: '#6366f1', productivity: '#14b8a6',
  relationship: '#ec4899', 'consent-risk': '#db2777', family: '#8b5cf6',
  social: '#06b6d4', ethics: '#0891b2',
  health: '#10b981', 'health-risk': '#059669', 'self-care': '#34d399',
  travel: '#0ea5e9', leisure: '#a3e635',
  legal: '#e11d48', 'legal-risk': '#be123c', violence: '#dc2626',
  'safety-risk': '#f97316', 'environment-risk': '#22c55e', other: '#64748b',
};
const PALETTE = ['#2563eb', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1', '#a3e635', '#e11d48'];
const DAY = 86400000;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const parseDate = (item) => {
  const raw = item?.timestamp || item?.createdAt || item?.savedAt || item?.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};
const riskOf = (h) => (h?.predictedRisk || h?.riskLevel || 'low');
const categoryOf = (h) => (h?.behaviour || h?.behavior || h?.category || 'other');
// Weighted per-decision regret weight (0-100): severity 0.4, harm 0.3, negativity 0.3.
const regretWeight = (h) =>
  (Number(h.severityScore) || 0) * 0.4 +
  (Number(h.harmfulnessScore) || 0) * 0.3 +
  (Number(h.negativityScore) || 0) * 0.3;

/* ── Small illustrated empty state (shown per chart when < 5 items) ─ */
function EmptyState({ hint }) {
  return (
    <div className="insight-empty">
      <svg width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="66" height="50" rx="8" stroke="var(--border2)" strokeWidth="2" strokeDasharray="5 5" />
        <circle cx="22" cy="34" r="4" fill="var(--blue)" opacity=".55" />
        <circle cx="36" cy="26" r="4" fill="var(--amber)" opacity=".55" />
        <circle cx="50" cy="20" r="4" fill="var(--green)" opacity=".55" />
        <path d="M22 34 L36 26 L50 20" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      </svg>
      <p className="insight-empty-title">Not enough data yet</p>
      <span className="insight-empty-hint">{hint}</span>
    </div>
  );
}

/* ── Card shell ───────────────────────────────────────────────────── */
function Card({ title, subtitle, span, children }) {
  return (
    <div className={`insight-card${span ? ` span-${span}` : ''}`}>
      <div className="insight-card-head">
        <h3>{title}</h3>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="insight-card-body">{children}</div>
    </div>
  );
}

export default function InsightsDashboard({ history = [], isDark = true }) {
  const enough = history.length >= 5;
  const axisColor = isDark ? '#8892a4' : '#3a5280';
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(58,90,154,.12)';
  const tooltipStyle = {
    background: isDark ? '#111520' : '#dce2ee',
    border: `1px solid ${isDark ? 'rgba(255,255,255,.12)' : 'rgba(58,90,154,.22)'}`,
    borderRadius: 8,
    color: isDark ? '#eef0f6' : '#1a2540',
    fontSize: 12,
    fontFamily: "'Outfit', sans-serif",
    boxShadow: '0 12px 30px rgba(0,0,0,.35)',
  };

  const data = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const dated = history.map((h) => ({ h, d: parseDate(h) })).filter((x) => x.d);

    /* 1. Risk over time — daily average severity, last 30 days */
    const dayBuckets = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today.getTime() - i * DAY);
      dayBuckets.push({ day, label: `${day.getMonth() + 1}/${day.getDate()}`, sum: 0, n: 0 });
    }
    const bucketIndex = (d) => Math.round((startOfDay(d).getTime() - dayBuckets[0].day.getTime()) / DAY);
    dated.forEach(({ h, d }) => {
      const idx = bucketIndex(d);
      if (idx >= 0 && idx < 30) { dayBuckets[idx].sum += Number(h.severityScore) || 0; dayBuckets[idx].n += 1; }
    });
    const riskOverTime = dayBuckets.map((b) => ({ label: b.label, score: b.n ? Math.round(b.sum / b.n) : null }));
    const scored = riskOverTime.filter((p) => p.score != null);
    const avgSeverity = scored.length ? scored.reduce((s, p) => s + p.score, 0) / scored.length : 0;
    const lineColor = avgSeverity > 60 ? RISK_COLORS.critical : avgSeverity >= 40 ? RISK_COLORS.high : RISK_COLORS.low;

    /* 2. Domain breakdown — share by behaviour category */
    const catCounts = {};
    history.forEach((h) => { const c = categoryOf(h); catCounts[c] = (catCounts[c] || 0) + 1; });
    let cats = Object.entries(catCounts).map(([name, value]) => ({ name, value }));
    cats.sort((a, b) => b.value - a.value);
    if (cats.length > 7) {
      const head = cats.slice(0, 6);
      const tail = cats.slice(6).reduce((s, c) => s + c.value, 0);
      cats = [...head, { name: 'other', value: tail }];
    }
    const catTotal = cats.reduce((s, c) => s + c.value, 0) || 1;
    const domainBreakdown = cats.map((c, i) => ({
      ...c,
      pct: Math.round((c.value / catTotal) * 100),
      color: CATEGORY_COLORS[c.name] || PALETTE[i % PALETTE.length],
      label: c.name.replace(/-/g, ' '),
    }));

    /* 3. Impulse heatmap — 7 days x 24 hours (Mon-first rows) */
    const heat = Array.from({ length: 7 }, () => new Array(24).fill(0));
    dated.forEach(({ d }) => {
      const row = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
      heat[row][d.getHours()] += 1;
    });
    let heatMax = 0;
    heat.forEach((r) => r.forEach((v) => { if (v > heatMax) heatMax = v; }));

    /* 4. Risk distribution — counts by level */
    const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    history.forEach((h) => { const r = riskOf(h); if (riskCounts[r] != null) riskCounts[r] += 1; });
    const riskDistribution = ['critical', 'high', 'medium', 'low'].map((k) => ({
      name: k[0].toUpperCase() + k.slice(1), key: k, count: riskCounts[k], color: RISK_COLORS[k],
    }));

    /* 5. Streak calendar — last 26 weeks of activity */
    const counts = {};
    const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dated.forEach(({ d }) => { const k = keyOf(startOfDay(d)); counts[k] = (counts[k] || 0) + 1; });
    const start = new Date(today.getTime() - (26 * 7 - 1) * DAY);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday
    const days = [];
    for (let c = new Date(start); c <= today; c.setDate(c.getDate() + 1)) {
      const dd = new Date(c);
      days.push({ date: dd, count: counts[keyOf(dd)] || 0, future: false });
    }
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    let activeDays = 0;
    Object.values(counts).forEach(() => { activeDays += 1; });

    /* 6. Regret Prevention Score */
    const isRisky = (h) => { const r = riskOf(h); return r === 'critical' || r === 'high'; };
    const scoreOf = (items) => {
      const risky = items.filter(isRisky);
      if (!risky.length) return null;
      const avg = risky.reduce((s, h) => s + regretWeight(h), 0) / risky.length;
      return Math.round(clamp(100 - avg));
    };
    const overall = scoreOf(history);
    const thisWeek = dated.filter(({ d }) => d >= new Date(now.getTime() - 7 * DAY)).map((x) => x.h);
    const lastWeek = dated
      .filter(({ d }) => d >= new Date(now.getTime() - 14 * DAY) && d < new Date(now.getTime() - 7 * DAY))
      .map((x) => x.h);
    const curScore = scoreOf(thisWeek);
    const prevScore = scoreOf(lastWeek);
    const trend = (curScore != null && prevScore != null) ? curScore - prevScore : null;

    return {
      riskOverTime, lineColor, avgSeverity: Math.round(avgSeverity),
      domainBreakdown,
      heat, heatMax,
      riskDistribution,
      weeks, activeDays,
      regret: { score: overall == null ? 100 : overall, hasRisky: overall != null, trend },
    };
  }, [history]);

  /* ── Streak color scale ─────────────────────────────────────────── */
  const streakColor = (c) => {
    if (!c) return isDark ? 'rgba(255,255,255,.05)' : 'rgba(58,90,154,.1)';
    if (c === 1) return 'rgba(16,185,129,.35)';
    if (c === 2) return 'rgba(16,185,129,.55)';
    if (c <= 4) return 'rgba(16,185,129,.78)';
    return '#10b981';
  };

  const pieLabel = ({ percent }) => (percent >= 0.08 ? `${Math.round(percent * 100)}%` : '');
  const scoreColor = (s) => (s >= 70 ? RISK_COLORS.low : s >= 40 ? RISK_COLORS.high : RISK_COLORS.critical);

  return (
    <div className="insights-view active">
      <div className="view-header">
        <div className="view-title">Insights</div>
        <div className="view-sub">Patterns and trends derived from your analyzed decisions.</div>
      </div>

      {/* ── Regret Prevention Score (hero) ── */}
      <div className="insight-card insight-hero">
        <div className="insight-card-head">
          <h3>Regret Prevention Score</h3>
          <span>Weighted resistance to high-risk impulses</span>
        </div>
        {!enough ? (
          <EmptyState hint="Your prevention score appears once you have 5+ analyzed decisions." />
        ) : (
          <div className="regret-body">
            <div className="regret-score" style={{ color: scoreColor(data.regret.score) }}>
              {data.regret.score}
              <span className="regret-max">/100</span>
            </div>
            <div className="regret-meta">
              {data.regret.trend == null ? (
                <span className="regret-trend flat">— no week-over-week change</span>
              ) : data.regret.trend > 0 ? (
                <span className="regret-trend up">▲ +{data.regret.trend} vs last week</span>
              ) : data.regret.trend < 0 ? (
                <span className="regret-trend down">▼ {data.regret.trend} vs last week</span>
              ) : (
                <span className="regret-trend flat">— unchanged vs last week</span>
              )}
              <p className="regret-note">
                {data.regret.hasRisky
                  ? 'Higher means you consistently paused on critical & high-risk decisions.'
                  : 'No high-risk decisions detected — nothing to regret yet.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Charts grid ── */}
      <div className="insights-grid">
        {/* 1. Risk over time */}
        <Card title="Risk Over Time" subtitle="Avg. severity, last 30 days" span={2}>
          {!enough ? (
            <EmptyState hint="Trend line builds up as you analyze decisions over several days." />
          ) : (
            <div className="chart-h">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.riskOverTime} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 11 }}
                    interval={Math.max(0, Math.floor(data.riskOverTime.length / 6))} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke={axisColor} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}/100`, 'Avg severity']} />
                  <Line type="monotone" dataKey="score" stroke={data.lineColor} strokeWidth={2.4}
                    dot={{ r: 2.5, fill: data.lineColor }} activeDot={{ r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 4. Risk distribution */}
        <Card title="Risk Distribution" subtitle="Decisions by risk level">
          {!enough ? (
            <EmptyState hint="See how your decisions spread across risk levels." />
          ) : (
            <div className="chart-h">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.riskDistribution} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" stroke={axisColor} tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis allowDecimals={false} stroke={axisColor} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor }} formatter={(v) => [v, 'Decisions']} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={54}>
                    {data.riskDistribution.map((e) => <Cell key={e.key} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 2. Domain breakdown */}
        <Card title="Domain Breakdown" subtitle="Share by behaviour category">
          {!enough ? (
            <EmptyState hint="Discover which life domains you deliberate on most." />
          ) : (
            <div className="chart-h">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.domainBreakdown} dataKey="value" nameKey="label" cx="50%" cy="50%"
                    innerRadius={44} outerRadius={78} paddingAngle={2} labelLine={false} label={pieLabel}>
                    {data.domainBreakdown.map((e) => <Cell key={e.name} stroke="none" fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} decisions`, n]} />
                  <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 3. Impulse heatmap (custom SVG) */}
        <Card title="Impulse Heatmap" subtitle="When you analyze — day × hour" span={2}>
          {!enough ? (
            <EmptyState hint="A day-by-hour map of your most active decision moments." />
          ) : (
            <HeatmapSVG heat={data.heat} max={data.heatMax} axisColor={axisColor} isDark={isDark} />
          )}
        </Card>

        {/* 5. Streak calendar (custom SVG) */}
        <Card title="Activity Streak" subtitle={`${data.activeDays} active day${data.activeDays === 1 ? '' : 's'} · last 26 weeks`} span={2}>
          {!enough ? (
            <EmptyState hint="A contribution-style calendar of days you showed up." />
          ) : (
            <StreakSVG weeks={data.weeks} color={streakColor} axisColor={axisColor} />
          )}
        </Card>
      </div>
    </div>
  );
}

/* ── Impulse heatmap: 7 rows (Mon-Sun) × 24 hour columns ──────────── */
function HeatmapSVG({ heat, max, axisColor, isDark }) {
  const cell = 20, gap = 3, left = 34, top = 6, bottom = 22;
  const w = left + 24 * (cell + gap);
  const h = top + 7 * (cell + gap) + bottom;
  const empty = isDark ? 'rgba(255,255,255,.05)' : 'rgba(58,90,154,.1)';
  const fill = (v) => {
    if (!v || !max) return empty;
    const t = v / max; // 0..1 → more active = deeper blue
    return `rgba(37,99,235,${(0.18 + 0.82 * t).toFixed(3)})`;
  };
  return (
    <div className="heatmap-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Decision activity by day and hour">
        {DOW.map((d, r) => (
          <text key={d} x={left - 8} y={top + r * (cell + gap) + cell / 2 + 3}
            fontSize="10" fill={axisColor} textAnchor="end">{d}</text>
        ))}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((hr) => (
          <text key={hr} x={left + hr * (cell + gap) + cell / 2} y={h - 6}
            fontSize="9.5" fill={axisColor} textAnchor="middle">{hr}</text>
        ))}
        {heat.map((row, r) =>
          row.map((v, c) => (
            <rect key={`${r}-${c}`} x={left + c * (cell + gap)} y={top + r * (cell + gap)}
              width={cell} height={cell} rx="4" fill={fill(v)}>
              <title>{`${DOW[r]} ${c}:00 — ${v} decision${v === 1 ? '' : 's'}`}</title>
            </rect>
          ))
        )}
      </svg>
    </div>
  );
}

/* ── GitHub-style streak calendar ─────────────────────────────────── */
function StreakSVG({ weeks, color, axisColor }) {
  const cell = 13, gap = 3, left = 30, top = 16;
  const w = left + weeks.length * (cell + gap);
  const h = top + 7 * (cell + gap);
  const rowLabels = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };
  let lastMonth = -1;
  return (
    <div className="streak-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Days with at least one analyzed decision">
        {weeks.map((week, wi) => {
          const first = week[0]?.date;
          let label = null;
          if (first && first.getMonth() !== lastMonth && first.getDate() <= 7) {
            lastMonth = first.getMonth();
            label = (
              <text key={`m-${wi}`} x={left + wi * (cell + gap)} y={11} fontSize="9.5" fill={axisColor}>
                {MONTHS[first.getMonth()]}
              </text>
            );
          }
          return label;
        })}
        {Object.entries(rowLabels).map(([r, txt]) => (
          <text key={txt} x={left - 6} y={top + Number(r) * (cell + gap) + cell - 2}
            fontSize="9" fill={axisColor} textAnchor="end">{txt}</text>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => (
            <rect key={`${wi}-${di}`} x={left + wi * (cell + gap)} y={top + di * (cell + gap)}
              width={cell} height={cell} rx="3" fill={color(day.count)}>
              <title>{`${day.date.toDateString()} — ${day.count} decision${day.count === 1 ? '' : 's'}`}</title>
            </rect>
          ))
        )}
      </svg>
      <div className="streak-legend">
        <span>Less</span>
        {[0, 1, 2, 4, 6].map((c) => <i key={c} style={{ background: color(c) }} />)}
        <span>More</span>
      </div>
    </div>
  );
}
