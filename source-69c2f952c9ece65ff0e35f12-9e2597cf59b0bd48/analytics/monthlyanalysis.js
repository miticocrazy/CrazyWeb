export function analyzeMonth(state, habits, monthKey, utils) {
  const [year, month] = monthKey.split('-').map(Number);
  const today = new Date();
  const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
  const daysTotal = new Date(year, month, 0).getDate();
  const daysElapsed = isCurrent ? today.getDate() : daysTotal;
  const totalHabits = habits.length;

  let completions = 0;
  let daysWithLogs = 0;
  for (let day = 1; day <= daysElapsed; day += 1) {
    const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = state.logs?.[dayKey] || null;
    if (log) daysWithLogs += 1;
    if (log) {
      Object.values(log).forEach((done) => { if (done) completions += 1; });
    }
  }

  const expected = totalHabits * daysElapsed || 1;
  const completionPct = Math.round((completions / expected) * 100);

  const weekTotals = [];
  const weekCount = Math.ceil(daysElapsed / 7);
  for (let w = 0; w < weekCount; w += 1) {
    const start = w * 7 + 1;
    const end = Math.min(daysElapsed, start + 6);
    let weekCompletions = 0;
    let weekExpected = 0;
    for (let d = start; d <= end; d += 1) {
      const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = state.logs?.[dayKey] || {};
      weekExpected += totalHabits;
      Object.values(log).forEach((done) => { if (done) weekCompletions += 1; });
    }
    const pct = weekExpected ? Math.round((weekCompletions / weekExpected) * 100) : 0;
    weekTotals.push({ label: `Semana ${w + 1}`, pct });
  }

  const habitStats = habits.map((h) => {
    let done = 0;
    for (let day = 1; day <= daysElapsed; day += 1) {
      const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (state.logs?.[dayKey]?.[h.id]) done += 1;
    }
    const pct = daysElapsed ? Math.round((done / daysElapsed) * 100) : 0;
    return { name: h.name, pct };
  });
  habitStats.sort((a, b) => a.pct - b.pct);

  return {
    totalHabits,
    completions,
    completionPct,
    daysWithLogs,
    weekTotals,
    weakestHabit: habitStats[0],
    strongestHabit: habitStats[habitStats.length - 1]
  };
}
