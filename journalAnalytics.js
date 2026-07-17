// journalAnalytics.js - Pure functions for prediction accuracy analysis.
// No API calls, no React. Kept side-effect free for easy unit testing.

// Rank predicted risk levels onto a severity scale.
const RISK_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

// A prediction is "correct" when the predicted risk lines up with the
// outcome the user reported:
//   high/critical  <-> worse_than_expected
//   medium         <-> as_expected
//   low            <-> better_than_expected
export function isPredictionCorrect(predictedRisk, actualRisk) {
  const r = String(predictedRisk || '').toLowerCase();
  if ((r === 'high' || r === 'critical') && actualRisk === 'worse_than_expected') return true;
  if (r === 'medium' && actualRisk === 'as_expected') return true;
  if (r === 'low' && actualRisk === 'better_than_expected') return true;
  return false;
}

// Pick a bar/text color for a 0-100 accuracy percentage.
export function accuracyColor(percent) {
  if (percent > 70) return '#10b981'; // green
  if (percent >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function domainOf(entry) {
  return (entry.behaviour || entry.behavior || entry.category || 'other')
    .toString()
    .toLowerCase();
}

function titleCase(str) {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Absolute week index (weeks since epoch). Falls back to null when the
// timestamp string can't be parsed.
function weekIndex(timestamp) {
  const t = Date.parse(timestamp);
  if (Number.isNaN(t)) return null;
  return Math.floor(t / (7 * 24 * 60 * 60 * 1000));
}

// Only history entries that have a journal outcome attached participate.
export function getJournaledEntries(history) {
  if (!Array.isArray(history)) return [];
  return history.filter(
    (e) => e && e.journal && typeof e.journal.actualRisk === 'string'
  );
}

// Main entry point. Returns everything the UI needs to render the
// "Your Prediction Accuracy" card. Pure: same input -> same output.
export function analyzeJournal(history) {
  const entries = getJournaledEntries(history);
  const total = entries.length;

  const empty = {
    hasEnoughData: false,
    totalEntries: total,
    correctPredictions: 0,
    overallScore: 0,
    byDomain: [],
    insights: [],
    trend: [],
    thisWeekAccuracy: 0,
    lastWeekAccuracy: 0,
    trendDirection: 'down'
  };

  if (total < 5) return empty;

  // 1. Overall accuracy
  let correct = 0;
  const domainMap = {};
  let overestimate = 0; // outcome better than we predicted
  let underestimate = 0; // outcome worse than we predicted

  for (const entry of entries) {
    const ok = isPredictionCorrect(entry.predictedRisk, entry.journal.actualRisk);
    if (ok) correct += 1;

    const d = domainOf(entry);
    if (!domainMap[d]) domainMap[d] = { domain: d, correct: 0, total: 0 };
    domainMap[d].total += 1;
    if (ok) domainMap[d].correct += 1;

    if (entry.journal.actualRisk === 'better_than_expected') overestimate += 1;
    else if (entry.journal.actualRisk === 'worse_than_expected') underestimate += 1;
  }

  const overallScore = Math.round((correct / total) * 100);

  // 2. Accuracy by domain
  const byDomain = Object.values(domainMap)
    .map((d) => {
      const percent = Math.round((d.correct / d.total) * 100);
      return {
        domain: d.domain,
        label: titleCase(d.domain),
        correct: d.correct,
        total: d.total,
        percent,
        color: accuracyColor(percent)
      };
    })
    .sort((a, b) => b.percent - a.percent);

  // 3. Pattern insights (3, generated locally)
  const insights = buildInsights(byDomain, overestimate, underestimate);

  // 4. Trend over the last 8 weeks
  const trend = buildTrend(entries);
  const thisWeekAccuracy = trend.length ? trend[trend.length - 1].accuracy : overallScore;
  const lastWeekAccuracy = trend.length > 1 ? trend[trend.length - 2].accuracy : thisWeekAccuracy;

  return {
    hasEnoughData: true,
    totalEntries: total,
    correctPredictions: correct,
    overallScore,
    byDomain,
    insights,
    trend,
    thisWeekAccuracy,
    lastWeekAccuracy,
    trendDirection: thisWeekAccuracy >= lastWeekAccuracy ? 'up' : 'down'
  };
}

function buildInsights(byDomain, overestimate, underestimate) {
  const insights = [];

  if (byDomain.length) {
    const worst = byDomain[byDomain.length - 1];
    insights.push(
      `Your lowest accuracy is in ${worst.label} decisions (${worst.correct}/${worst.total}, ${worst.percent}%). Slow down and double-check before acting there.`
    );
  }

  if (overestimate > underestimate) {
    insights.push(
      `You tend to overestimate severity — ${overestimate} outcomes turned out better than predicted. Trust your calmer instincts a little more.`
    );
  } else if (underestimate > overestimate) {
    insights.push(
      `You tend to underestimate severity — ${underestimate} outcomes turned out worse than predicted. Give risky-looking decisions extra weight.`
    );
  } else {
    insights.push(
      `Your severity estimates are well balanced — over- and under-estimates cancel out. Keep calibrating.`
    );
  }

  if (byDomain.length) {
    const best = byDomain[0];
    insights.push(
      `You're more accurate with ${best.label} decisions. Start there when making important choices.`
    );
  }

  return insights;
}

function buildTrend(entries) {
  // Bucket entries into absolute week indices, keeping only parseable dates.
  const buckets = {};
  for (const entry of entries) {
    const wk = weekIndex(entry.timestamp);
    if (wk === null) continue;
    if (!buckets[wk]) buckets[wk] = { correct: 0, total: 0 };
    buckets[wk].total += 1;
    if (isPredictionCorrect(entry.predictedRisk, entry.journal.actualRisk)) {
      buckets[wk].correct += 1;
    }
  }

  const weeks = Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(-8);

  const points = weeks.map((wk, i) => ({
    week: `W${i + 1}`,
    accuracy: Math.round((buckets[wk].correct / buckets[wk].total) * 100)
  }));

  // Moving average with a 3-point trailing window.
  return points.map((p, i) => {
    const windowStart = Math.max(0, i - 2);
    const slice = points.slice(windowStart, i + 1);
    const avg = Math.round(
      slice.reduce((sum, s) => sum + s.accuracy, 0) / slice.length
    );
    return { ...p, movingAvg: avg };
  });
}
