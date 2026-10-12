export function computeWeekdayPatterns(state, habits, utils, days = 56) {
  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);
  const now = new Date();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = utils.dateKey(d);
    const log = state.logs?.[key] || {};
    const total = habits.length || 1;
    let done = 0;
    habits.forEach((h) => { if (log[h.id]) done += 1; });
    const weekday = (d.getDay() + 6) % 7; // Monday = 0
    totals[weekday] += done / total;
    counts[weekday] += 1;
  }

  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return labels.map((label, idx) => {
    const avg = counts[idx] ? Math.round((totals[idx] / counts[idx]) * 100) : 0;
    return { label, pct: avg };
  });
}
