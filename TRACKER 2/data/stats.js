export function initStats(ctx) {
  function trend7vs7() {
    const now = new Date();
    let last7 = 0;
    let prev7 = 0;
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      last7 += ctx.habits.completion(ctx.utils.dateKey(d)).ratio;
    }
    for (let i = 7; i < 14; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      prev7 += ctx.habits.completion(ctx.utils.dateKey(d)).ratio;
    }
    return Math.round(((last7 - prev7) / 7) * 100);
  }

  function completionRatioForDay(dayKey) {
    return ctx.habits.completion(dayKey).ratio;
  }

  ctx.stats = {
    trend7vs7,
    completionRatioForDay
  };
}
