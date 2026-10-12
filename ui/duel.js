export function initDuel(ctx) {
  let duelRows = [];
  let duelHistory = [];

  const EVENTS = [
    { id: 'motivacion', text: 'Evento motivación: si completas todo hoy, sumas un impulso moral.' },
    { id: 'focus', text: 'Evento foco: un hábito clave vale doble para ti hoy.' },
    { id: 'respiro', text: 'Evento respiro: aunque sea 1 hábito, cuenta como mini victoria.' },
    { id: 'ritmo', text: 'Evento ritmo: dos hábitos seguidos antes de las 20:00.' }
  ];

  function defaultDuelName() {
    if (localStorage.getItem(ctx.config.DUEL_NAME_KEY)) return localStorage.getItem(ctx.config.DUEL_NAME_KEY);
    if (ctx.currentUser?.email) return ctx.currentUser.email.split('@')[0];
    return 'Jugador';
  }

  function hydrateDuelName() {
    const aliasEl = document.getElementById('duel-alias');
    if (aliasEl) aliasEl.textContent = `Alias: ${defaultDuelName()}`;
    const month = document.getElementById('duel-month');
    if (month) month.textContent = `Mes: ${ctx.utils.currentMonthKey()}`;
    const settingsInput = document.getElementById('settings-alias-input');
    if (settingsInput && document.activeElement !== settingsInput) {
      settingsInput.value = defaultDuelName();
    }
  }

  function setAlias(name) {
    if (!name) return false;
    localStorage.setItem(ctx.config.DUEL_NAME_KEY, name);
    scheduleDuelUpdate(true);
    hydrateDuelName();
    return true;
  }

  function scheduleDuelUpdate(immediate) {
    clearTimeout(ctx.timers.duelUpdate);
    if (immediate) {
      updateDuelScore(true).then(() => fetchDuelBoard(true));
      return;
    }
    ctx.timers.duelUpdate = setTimeout(() => {
      updateDuelScore(true).then(() => fetchDuelBoard(true));
    }, 1200);
  }

  async function updateDuelScore(silent = false) {
    if (!ctx.currentUser) return;
    const payload = {
      user_id: ctx.currentUser.id,
      month_key: ctx.utils.currentMonthKey(),
      display_name: defaultDuelName(),
      completed_count: ctx.habits.countMonthCompleted(),
      updated_at: new Date().toISOString()
    };
    try {
      const { error } = await ctx.supabaseClient.from(ctx.config.DUEL_TABLE).upsert(payload, { onConflict: 'user_id,month_key' });
      if (error && !silent) {
        ctx.notifyError('No se pudo actualizar duelo', error, 'duel-note');
      }
    } catch (error) {
      if (!silent) ctx.notifyError('Error de red en duelo', error, 'duel-note');
    }
  }

  async function fetchDuelBoard(silent = false) {
    if (!ctx.currentUser) return;
    try {
      const { data, error } = await ctx.supabaseClient
        .from(ctx.config.DUEL_TABLE)
        .select('user_id,display_name,completed_count')
        .eq('month_key', ctx.utils.currentMonthKey())
        .order('completed_count', { ascending: false })
        .limit(6);
      if (error) {
        if (!silent) ctx.notifyError('No se pudo leer clasificación del duelo', error, 'duel-note');
        return;
      }
      duelRows = Array.isArray(data) ? data : [];
      renderDuelBoard();
      renderDuelDominance();
      renderDuelStatus();
    } catch (error) {
      if (!silent) ctx.notifyError('Error de red en clasificación', error, 'duel-note');
    }
  }

  function recentMonthKeys(count = 6) {
    const keys = [];
    const now = new Date();
    for (let i = 0; i < count; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(ctx.utils.currentMonthKey(d));
    }
    return keys;
  }

  async function fetchDuelHistory(silent = false) {
    if (!ctx.currentUser) return;
    const keys = recentMonthKeys(6);
    try {
      const { data, error } = await ctx.supabaseClient
        .from(ctx.config.DUEL_TABLE)
        .select('month_key,display_name,completed_count')
        .in('month_key', keys);
      if (error) {
        if (!silent) ctx.notifyError('No se pudo leer historial del duelo', error, 'duel-note');
        return;
      }
      const rows = Array.isArray(data) ? data : [];
      duelHistory = keys.map((key) => {
        const monthRows = rows.filter((r) => r.month_key === key);
        if (!monthRows.length) return null;
        monthRows.sort((a, b) => (b.completed_count || 0) - (a.completed_count || 0));
        const winner = monthRows[0];
        return { month: key, name: winner.display_name || 'Jugador', score: winner.completed_count || 0 };
      }).filter(Boolean);
      renderDuelHistory();
    } catch (error) {
      if (!silent) ctx.notifyError('Error de red en historial', error, 'duel-note');
    }
  }

  function renderDuelBoard() {
    const box = document.getElementById('duel-board');
    if (!box) return;
    if (!duelRows.length) {
      box.innerHTML = '<p class="muted" style="margin-top:6px;">Sin puntuaciones todavía.</p>';
      return;
    }
    box.innerHTML = duelRows.map((r, i) => {
      const me = ctx.currentUser && r.user_id === ctx.currentUser.id;
      const crown = i === 0 ? '👑 ' : '';
      return `<div class="duel-row ${me ? 'me' : ''}"><span>${crown}${ctx.utils.escapeHtml(r.display_name || 'Jugador')}</span><span class="duel-score">${Number(r.completed_count || 0)}</span></div>`;
    }).join('');
  }

  function renderDuelDominance() {
    const box = document.getElementById('duel-dominance');
    if (!box) return;
    if (!duelRows.length) {
      box.innerHTML = '<p class="muted">Sin datos del duelo.</p>';
      return;
    }
    const me = duelRows.find((r) => ctx.currentUser && r.user_id === ctx.currentUser.id);
    const rival = duelRows.find((r) => !ctx.currentUser || r.user_id !== ctx.currentUser.id) || null;
    const meCount = Number(me?.completed_count || 0);
    const rivalCount = Number(rival?.completed_count || 0);
    const total = meCount + rivalCount;
    const mePct = total ? Math.round((meCount / total) * 100) : 50;
    const rivalPct = 100 - mePct;
    const meName = me?.display_name || 'Tú';
    const rivalName = rival?.display_name || 'Rival';

    box.innerHTML = `
      <div class="duel-meta"><span>${ctx.utils.escapeHtml(meName)} · ${meCount}</span><span>${ctx.utils.escapeHtml(rivalName)} · ${rivalCount}</span></div>
      <div class="duel-bar"><span style="width:${mePct}%"></span><span class="rival" style="width:${rivalPct}%"></span></div>
    `;
  }

  function renderDuelHistory() {
    const box = document.getElementById('duel-history');
    if (!box) return;
    if (!duelHistory.length) {
      box.innerHTML = '<p class="muted" style="margin-top:6px;">Sin historial todavía.</p>';
      return;
    }
    box.innerHTML = duelHistory.map((h) => {
      const label = h.month.replace('-', '/');
      return `<div>Mes ${label}: ${ctx.utils.escapeHtml(h.name)} (${h.score})</div>`;
    }).join('');
  }

  function renderDuelStatus() {
    const box = document.getElementById('duel-status');
    if (!box) return;
    if (!duelRows.length) {
      box.textContent = '';
      return;
    }
    const me = duelRows.find((r) => ctx.currentUser && r.user_id === ctx.currentUser.id);
    const rival = duelRows.find((r) => !ctx.currentUser || r.user_id !== ctx.currentUser.id) || null;
    const meCount = Number(me?.completed_count || 0);
    const rivalCount = Number(rival?.completed_count || 0);
    if (!rival) {
      box.textContent = 'Esperando rival.';
      return;
    }
    const diff = meCount - rivalCount;
    if (diff > 0) {
      box.textContent = `Vas delante por ${diff} hábitos.`;
    } else if (diff < 0) {
      box.textContent = `Vas detrás por ${Math.abs(diff)} hábitos.`;
    } else {
      box.textContent = 'Duelo empatado.';
    }

    const dramaKey = `duel-drama:${ctx.utils.dateKey()}`;
    if (Math.abs(diff) <= 3 && !localStorage.getItem(dramaKey)) {
      localStorage.setItem(dramaKey, '1');
      ctx.ui.showSyncReminder('Duelo apretado: 3 hábitos pueden decidirlo.', 'info', 5200);
    }
  }

  function comboStreak() {
    let s = 0;
    const base = new Date();
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const c = ctx.habits.completion(ctx.utils.dateKey(d));
      if (c.total > 0 && c.done === c.total) s += 1;
      else break;
    }
    return s;
  }

  function renderDuelCombo() {
    const box = document.getElementById('duel-combo');
    if (!box) return;
    const combo = comboStreak();
    if (combo >= 3) {
      box.textContent = `Combo activo: ${combo} días perfectos seguidos.`;
    } else if (combo > 0) {
      box.textContent = `Combo: ${combo} día${combo === 1 ? '' : 's'} perfecto${combo === 1 ? '' : 's'}.`;
    } else {
      box.textContent = 'Sin combo activo.';
    }
  }

  function renderDuelEvent() {
    const box = document.getElementById('duel-event');
    if (!box) return;
    const today = ctx.utils.dateKey();
    const event = EVENTS[Number(today.replace(/-/g, '')) % EVENTS.length];
    const todayCompletion = ctx.habits.completion(today);
    const bonus = todayCompletion.total > 0 && todayCompletion.done === todayCompletion.total;
    box.textContent = bonus ? `${event.text} Bonus activado.` : event.text;
  }

  async function refreshDuel() {
    await updateDuelScore(true);
    await fetchDuelBoard(false);
    await fetchDuelHistory(false);
    ctx.ui.setNote('duel-note', 'Duelo actualizado.');
  }

  function isAliasInList(list) {
    const alias = ctx.utils.normalizeText(defaultDuelName());
    return list.some((a) => alias === ctx.utils.normalizeText(a));
  }

  function aliasMatches(value, list) {
    const alias = ctx.utils.normalizeText(value);
    return list.some((a) => alias === ctx.utils.normalizeText(a));
  }

  function isPauloUser() {
    return isAliasInList(ctx.config.PAULO_ALIASES);
  }

  function isNaroaUser() {
    return isAliasInList(ctx.config.NAROA_ALIASES);
  }

  function relationTargetAlias() {
    if (isPauloUser()) return 'naroa';
    if (isNaroaUser()) return 'paulo';
    return '';
  }

  async function publishRelationEvent(day) {
    if (!ctx.currentUser) return;
    const targetAlias = relationTargetAlias();
    if (!targetAlias) return;
    try {
      const payload = {
        day_key: day,
        target_alias: targetAlias,
        sender_alias: defaultDuelName(),
        sender_user_id: ctx.currentUser.id,
        updated_at: new Date().toISOString()
      };
      const { error } = await ctx.supabaseClient
        .from(ctx.config.RELATION_EVENT_TABLE)
        .upsert(payload, { onConflict: 'day_key,target_alias' });
      if (error) {
        if (error.code === 'PGRST205' && !localStorage.getItem(ctx.config.RELATION_EVENT_WARN_KEY)) {
          localStorage.setItem(ctx.config.RELATION_EVENT_WARN_KEY, '1');
          ctx.ui.showSyncReminder('Activa la tabla tracker_relation_events para notificaciones de pareja.', 'info', 5200);
        }
        return;
      }
      await maybeShowBothCompletedMessage(day);
    } catch (_) {}
  }

  async function fetchRelationEventsForDay(day) {
    try {
      const { data, error } = await ctx.supabaseClient
        .from(ctx.config.RELATION_EVENT_TABLE)
        .select('day_key,target_alias,sender_alias')
        .eq('day_key', day)
        .in('target_alias', ['paulo', 'naroa']);
      if (error) {
        if (error.code === 'PGRST205' && !localStorage.getItem(ctx.config.RELATION_EVENT_WARN_KEY)) {
          localStorage.setItem(ctx.config.RELATION_EVENT_WARN_KEY, '1');
          ctx.ui.showSyncReminder('Activa la tabla tracker_relation_events para notificaciones de pareja.', 'info', 5200);
        }
        return null;
      }
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return null;
    }
  }

  async function findRelationEventForToday(day, targetAlias) {
    try {
      const { data, error } = await ctx.supabaseClient
        .from(ctx.config.RELATION_EVENT_TABLE)
        .select('day_key,target_alias,sender_alias')
        .eq('day_key', day)
        .eq('target_alias', targetAlias)
        .maybeSingle();
      if (error) {
        if (error.code === 'PGRST205' && !localStorage.getItem(ctx.config.RELATION_EVENT_WARN_KEY)) {
          localStorage.setItem(ctx.config.RELATION_EVENT_WARN_KEY, '1');
          ctx.ui.showSyncReminder('Activa la tabla tracker_relation_events para notificaciones de pareja.', 'info', 5200);
        }
        return null;
      }
      return data || null;
    } catch (_) {
      return null;
    }
  }

  function triggerRelationEventIfNeeded(habitId, day, doneNow) {
    if (!doneNow) return;
    if (day !== ctx.utils.dateKey()) return;
    const habit = ctx.state.habits.find((h) => h.id === habitId);
    if (!habit || !isRelationHabit(habit.name)) return;
    publishRelationEvent(day);
  }

  function isRelationHabit(habitName) {
    const normalized = ctx.utils.normalizeText(habitName);
    return ctx.config.RELATION_HABIT_NAMES.some((n) => normalized === ctx.utils.normalizeText(n));
  }

  function relationMessageForDay(day) {
    return ctx.utils.messageForDay(day, ctx.config.RELATION_MESSAGES);
  }

  function relationBothMessageForDay(day) {
    return ctx.utils.messageForDay(day, ctx.config.RELATION_BOTH_MESSAGES);
  }

  async function maybeShowRelationEntryMessage() {
    if (!ctx.currentUser || !isNaroaUser()) return;
    const today = ctx.utils.dateKey();
    const event = await findRelationEventForToday(today, 'naroa');
    if (!event || !aliasMatches(event.sender_alias, ctx.config.PAULO_ALIASES)) return;
    const noticeKey = `${ctx.config.RELATION_NOTICE_KEY}:${ctx.currentUser.id}:${today}`;
    if (localStorage.getItem(noticeKey)) return;
    localStorage.setItem(noticeKey, '1');
    const msg = `Paulo ya completó "Cuidar la relación" hoy. ${relationMessageForDay(today)}`;
    ctx.ui.showSyncReminder(msg, 'success', 5200);
    ctx.ui.setNote('habit-note', msg);
  }

  async function maybeShowBothCompletedMessage(day = ctx.utils.dateKey()) {
    if (!ctx.currentUser) return;
    if (!isPauloUser() && !isNaroaUser()) return;
    if (day !== ctx.utils.dateKey()) return;
    const noticeKey = `${ctx.config.RELATION_BOTH_NOTICE_KEY}:${ctx.currentUser.id}:${day}`;
    if (localStorage.getItem(noticeKey)) return;
    const events = await fetchRelationEventsForDay(day);
    if (!events || events.length < 2) return;
    const hasPaulo = events.some((e) => aliasMatches(e.sender_alias, ctx.config.PAULO_ALIASES));
    const hasNaroa = events.some((e) => aliasMatches(e.sender_alias, ctx.config.NAROA_ALIASES));
    if (!hasPaulo || !hasNaroa) return;
    localStorage.setItem(noticeKey, '1');
    const msg = relationBothMessageForDay(day);
    ctx.ui.showRelationCelebration(msg);
    ctx.ui.setNote('habit-note', msg);
  }

  ctx.duel = {
    hydrateDuelName,
    setAlias,
    scheduleDuelUpdate,
    updateDuelScore,
    fetchDuelBoard,
    fetchDuelHistory,
    renderDuelBoard,
    renderDuelDominance,
    renderDuelHistory,
    renderDuelStatus,
    renderDuelCombo,
    renderDuelEvent,
    refreshDuel,
    triggerRelationEventIfNeeded,
    maybeShowRelationEntryMessage,
    maybeShowBothCompletedMessage,
    getDuelRows: () => duelRows,
    getDuelHistory: () => duelHistory,
    defaultDuelName
  };
}
