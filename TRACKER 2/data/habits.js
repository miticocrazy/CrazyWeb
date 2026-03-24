export function initHabits(ctx) {
  function addHabit() {
    const input = document.getElementById('new-habit');
    const iconInput = document.getElementById('new-habit-icon');
    const name = String(input.value || '').trim().replace(/\s+/g, ' ');
    const icon = String(iconInput?.value || '').trim();
    if (!name) return ctx.ui.setNote('habit-note', 'Escribe un hábito.', true);
    if (ctx.state.habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) {
      return ctx.ui.setNote('habit-note', 'Ese hábito ya existe.', true);
    }
    ctx.state.habits.push({ id: ctx.utils.uid(), name, icon });
    input.value = '';
    if (iconInput) iconInput.value = '';
    ctx.data.save();
    ctx.dashboard.render();
    ctx.ui.setNote('habit-note', 'Hábito añadido.');
  }

  function promptHabitIcon(habitId) {
    const habit = ctx.state.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const next = prompt('Emoji del hábito (ej: 💧)', habit.icon || '');
    if (next === null) return;
    habit.icon = String(next).trim().slice(0, 2);
    ctx.data.save();
    ctx.dashboard.render();
  }

  function toggleHabit(habitId, day = ctx.selectedDayKey) {
    if (!ctx.state.logs[day]) ctx.state.logs[day] = {};
    ctx.state.logs[day][habitId] = !ctx.state.logs[day][habitId];
    if (ctx.duel?.triggerRelationEventIfNeeded) {
      ctx.duel.triggerRelationEventIfNeeded(habitId, day, ctx.state.logs[day][habitId]);
    }
    ctx.data.save();
    ctx.dashboard.render();
  }

  function removeHabit(habitId) {
    if (!confirm('¿Eliminar hábito y su historial?')) return;
    ctx.state.habits = ctx.state.habits.filter((h) => h.id !== habitId);
    Object.keys(ctx.state.logs).forEach((d) => { if (ctx.state.logs[d]) delete ctx.state.logs[d][habitId]; });
    ctx.data.save();
    ctx.dashboard.render();
  }

  function completion(day) {
    const total = ctx.state.habits.length || 1;
    const log = ctx.state.logs[day] || {};
    let done = 0;
    ctx.state.habits.forEach((h) => { if (log[h.id]) done += 1; });
    return { done, total, ratio: done / total };
  }

  function streak() {
    let s = 0;
    const base = new Date();
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const c = completion(ctx.utils.dateKey(d));
      if (c.done > 0) s += 1;
      else break;
    }
    return s;
  }

  function consistency30() {
    let acc = 0;
    const now = new Date();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      acc += completion(ctx.utils.dateKey(d)).ratio;
    }
    return Math.round((acc / 30) * 100);
  }

  function habitPerformance30() {
    const now = new Date();
    return ctx.state.habits.map((h) => {
      let done = 0;
      for (let i = 0; i < 30; i += 1) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        if ((ctx.state.logs[ctx.utils.dateKey(d)] || {})[h.id]) done += 1;
      }
      return { name: h.name, pct: Math.round((done / 30) * 100) };
    });
  }

  function countMonthCompleted(monthKey = ctx.utils.currentMonthKey()) {
    let total = 0;
    Object.keys(ctx.state.logs || {}).forEach((dayKey) => {
      if (!dayKey.startsWith(monthKey)) return;
      const dayLog = ctx.state.logs[dayKey] || {};
      Object.keys(dayLog).forEach((hid) => {
        if (dayLog[hid]) total += 1;
      });
    });
    return total;
  }

  ctx.habits = {
    addHabit,
    toggleHabit,
    removeHabit,
    promptHabitIcon,
    completion,
    streak,
    consistency30,
    habitPerformance30,
    countMonthCompleted
  };
}
