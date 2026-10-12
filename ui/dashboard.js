export function initDashboard(ctx) {
  function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-label');
    const selected = document.getElementById('selected-date');
    if (!grid || !label || !selected) return;

    const y = ctx.calendarCursor.getFullYear();
    const m = ctx.calendarCursor.getMonth();
    label.textContent = ctx.utils.monthLabel(ctx.calendarCursor);
    selected.textContent = `Día seleccionado: ${ctx.utils.formatDateLabel(ctx.selectedDayKey)}`;

    const first = new Date(y, m, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const totalDays = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const headers = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    let html = headers.map((h) => `<div class="day-name">${h}</div>`).join('');

    for (let i = 0; i < startWeekday; i += 1) {
      const day = prevDays - startWeekday + i + 1;
      const k = ctx.utils.dateKey(new Date(y, m - 1, day));
      html += `<button class="day-cell is-outside ${ctx.utils.level(ctx.habits.completion(k).ratio)}" onclick="selectDay('${k}')">${day}</button>`;
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const k = ctx.utils.dateKey(new Date(y, m, day));
      const cls = ['day-cell', ctx.utils.level(ctx.habits.completion(k).ratio), k === ctx.selectedDayKey ? 'is-selected' : '', k === ctx.utils.dateKey() ? 'is-today' : ''].join(' ').trim();
      html += `<button class="${cls}" onclick="selectDay('${k}')">${day}</button>`;
    }

    const used = startWeekday + totalDays;
    const tail = (7 - (used % 7)) % 7;
    for (let i = 1; i <= tail; i += 1) {
      const k = ctx.utils.dateKey(new Date(y, m + 1, i));
      html += `<button class="day-cell is-outside ${ctx.utils.level(ctx.habits.completion(k).ratio)}" onclick="selectDay('${k}')">${i}</button>`;
    }

    grid.innerHTML = html;
  }

  function renderNotes() {
    const textarea = document.getElementById('day-notes');
    const meta = document.getElementById('notes-date');
    if (!textarea || !meta) return;
    const value = ctx.state.notes?.[ctx.selectedDayKey] || '';
    meta.textContent = `Hoja de ${ctx.utils.formatDateLabel(ctx.selectedDayKey)}`;
    if (document.activeElement !== textarea || textarea.value !== value) {
      textarea.value = value;
    }
  }

  function updateNotes() {
    const textarea = document.getElementById('day-notes');
    if (!textarea) return;
    ctx.state.notes = ctx.state.notes || {};
    ctx.state.notes[ctx.selectedDayKey] = textarea.value;
    ctx.storage.saveLocalState();
    clearTimeout(ctx.timers.notes);
    ctx.timers.notes = setTimeout(() => {
      ctx.data.save();
    }, 650);
  }

  function clearNotes() {
    const textarea = document.getElementById('day-notes');
    if (!textarea) return;
    if (!textarea.value.trim()) return ctx.ui.setNote('notes-note', 'No hay notas para limpiar.');
    if (!confirm('¿Borrar las notas de este día?')) return;
    textarea.value = '';
    ctx.state.notes = ctx.state.notes || {};
    ctx.state.notes[ctx.selectedDayKey] = '';
    ctx.data.save();
    ctx.ui.setNote('notes-note', 'Notas borradas.');
  }

  function render() {
    const c = ctx.habits.completion(ctx.selectedDayKey);
    const consistency = ctx.habits.consistency30();

    document.getElementById('kpi-hoy').textContent = `${c.done}/${ctx.state.habits.length}`;
    document.getElementById('kpi-consistency').textContent = `${consistency}%`;
    document.getElementById('kpi-streak').textContent = `${ctx.habits.streak()} días`;
    document.getElementById('kpi-hoy').style.color = ctx.utils.colorByRatio(ctx.state.habits.length ? c.done / ctx.state.habits.length : 0);
    document.getElementById('kpi-consistency').style.color = ctx.utils.colorByRatio(consistency / 100);

    const title = document.getElementById('habit-title');
    if (title) title.textContent = `Hábitos de ${ctx.utils.formatDateLabel(ctx.selectedDayKey)}`;

    const list = document.getElementById('habit-list');
    if (!ctx.state.habits.length) {
      list.innerHTML = '<p class="muted">No hay hábitos. Añade el primero.</p>';
    } else {
      const log = ctx.state.logs[ctx.selectedDayKey] || {};
      list.innerHTML = ctx.state.habits.map((h) => {
        const done = Boolean(log[h.id]);
        const icon = h.icon ? ctx.utils.escapeHtml(h.icon) : '•';
        const iconClass = h.icon ? 'habit-icon' : 'habit-icon placeholder';
        return `<div class="habit ${done ? 'done' : ''}">
          <div class="habit-name"><span class="${iconClass}">${icon}</span>${ctx.utils.escapeHtml(h.name)}</div>
          <div class="row">
            <input type="checkbox" ${done ? 'checked' : ''} onchange="toggleHabit('${h.id}', '${ctx.selectedDayKey}')" />
            <button class="btn-ghost" onclick="promptHabitIcon('${h.id}')">Icono</button>
            <button onclick="removeHabit('${h.id}')">Quitar</button>
          </div>
        </div>`;
      }).join('');
    }

    renderCalendar();
    renderNotes();
    ctx.duel.renderDuelBoard();
    ctx.duel.renderDuelStatus();
    ctx.duel.renderDuelHistory();
    ctx.duel.renderDuelCombo();
    ctx.duel.renderDuelDominance();
    ctx.duel.renderDuelEvent();

    if (ctx.admin?.isOpen()) ctx.admin.refresh();
  }

  function moveMonth(delta) {
    ctx.calendarCursor = new Date(ctx.calendarCursor.getFullYear(), ctx.calendarCursor.getMonth() + delta, 1);
    render();
  }

  function goToToday() {
    ctx.selectedDayKey = ctx.utils.dateKey();
    ctx.calendarCursor = new Date();
    render();
  }

  function selectDay(k) {
    ctx.selectedDayKey = k;
    const d = ctx.utils.parseDateKey(k);
    ctx.calendarCursor = new Date(d.getFullYear(), d.getMonth(), 1);
    render();
  }

  ctx.dashboard = {
    render,
    renderNotes,
    updateNotes,
    clearNotes,
    moveMonth,
    goToToday,
    selectDay
  };
}
