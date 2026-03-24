import { analyzeMonth } from '../analytics/monthlyAnalysis.js';
import { computeWeekdayPatterns } from '../analytics/habitPatterns.js';
import { predictOutcomes } from '../analytics/predictions.js';

export function initAdminPanel(ctx) {
  const panel = document.getElementById('admin-panel');
  const updated = document.getElementById('admin-updated');
  const summaryEl = document.getElementById('admin-summary');
  const weeklyEl = document.getElementById('admin-weekly');
  const patternsEl = document.getElementById('admin-patterns');
  const heatmapEl = document.getElementById('admin-heatmap');
  const predictionEl = document.getElementById('admin-prediction');
  const duelEl = document.getElementById('admin-duel');
  const title = document.querySelector('.title h1');
  let open = false;
  let tapCount = 0;
  let tapTimer = null;

  function openPanel() {
    if (!panel) return;
    panel.classList.remove('hidden');
    open = true;
    refresh();
  }

  function close() {
    if (!panel) return;
    panel.classList.add('hidden');
    open = false;
  }

  function isOpen() {
    return open;
  }

  function attachSecretTrigger() {
    if (!title) return;
    title.addEventListener('click', () => {
      tapCount += 1;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { tapCount = 0; }, 1600);
      if (tapCount >= 5) {
        tapCount = 0;
        openPanel();
      }
    });
  }

  function renderHeatmap() {
    if (!heatmapEl) return;
    const cells = [];
    const now = new Date();
    for (let i = 27; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const ratio = ctx.habits.completion(ctx.utils.dateKey(d)).ratio;
      const cls = ctx.utils.level(ratio);
      cells.push(`<div class="cell ${cls}" title="${d.toLocaleDateString('es-ES')}"></div>`);
    }
    heatmapEl.innerHTML = cells.join('');
  }

  function refresh() {
    if (!open) return;
    const monthKey = ctx.utils.currentMonthKey();
    const analysis = analyzeMonth(ctx.state, ctx.state.habits, monthKey, ctx.utils);
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div>Hábitos: ${analysis.totalHabits}</div>
        <div>Completados: ${analysis.completions}</div>
        <div>Consistencia: ${analysis.completionPct}%</div>
        <div>Con registros: ${analysis.daysWithLogs} días</div>
        <div>Fuerte: ${analysis.strongestHabit?.name || '-'} (${analysis.strongestHabit?.pct ?? 0}%)</div>
        <div>Débil: ${analysis.weakestHabit?.name || '-'} (${analysis.weakestHabit?.pct ?? 0}%)</div>
      `;
    }

    if (weeklyEl) {
      weeklyEl.innerHTML = analysis.weekTotals.map((w) => `<div>${w.label}: ${w.pct}%</div>`).join('');
    }

    if (patternsEl) {
      const patterns = computeWeekdayPatterns(ctx.state, ctx.state.habits, ctx.utils, 56);
      patternsEl.innerHTML = patterns.map((p) => `<div>${p.label}: ${p.pct}%</div>`).join('');
    }

    renderHeatmap();

    if (predictionEl) {
      const duelRows = ctx.duel.getDuelRows();
      const habitPerf = ctx.habits.habitPerformance30().sort((a, b) => a.pct - b.pct);
      const prediction = predictOutcomes(ctx.state, habitPerf, duelRows, ctx.utils, ctx.currentUser);
      predictionEl.innerHTML = `
        <div>Proyección tú: ${prediction.myProjection}</div>
        <div>Proyección rival: ${prediction.rivalProjection}</div>
        <div>Ganador probable: ${prediction.winner}</div>
        <div>${prediction.note}</div>
      `;
    }

    if (duelEl) {
      const rows = ctx.duel.getDuelRows();
      if (!rows.length) {
        duelEl.textContent = 'Sin datos de duelo.';
      } else {
        const top = rows[0];
        duelEl.innerHTML = `
          <div>Líder actual: ${ctx.utils.escapeHtml(top.display_name || 'Jugador')} (${top.completed_count || 0})</div>
          <div>Combo actual: ${ctx.habits.streak()} días con hábitos completados.</div>
        `;
      }
    }

    if (updated) {
      updated.textContent = `Actualizado ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  if (panel) {
    panel.addEventListener('click', (event) => {
      if (event.target === panel) close();
    });
  }

  attachSecretTrigger();

  return { open: openPanel, close, refresh, isOpen };
}
