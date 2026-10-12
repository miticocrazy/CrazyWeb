export function predictOutcomes(state, habits, duelRows, utils, currentUser) {
  const today = new Date();
  const daysInMonth = utils.daysInMonth(today);
  const dayOfMonth = today.getDate();

  const myRow = duelRows.find((r) => currentUser && r.user_id === currentUser.id) || null;
  const rivalRow = duelRows.find((r) => !currentUser || r.user_id !== currentUser.id) || null;

  const myCount = Number(myRow?.completed_count || 0);
  const rivalCount = Number(rivalRow?.completed_count || 0);

  const myDaily = dayOfMonth ? myCount / dayOfMonth : 0;
  const rivalDaily = dayOfMonth ? rivalCount / dayOfMonth : 0;

  const myProjection = Math.round(myCount + myDaily * (daysInMonth - dayOfMonth));
  const rivalProjection = Math.round(rivalCount + rivalDaily * (daysInMonth - dayOfMonth));

  let winner = 'Empate';
  if (myProjection > rivalProjection) winner = myRow?.display_name || 'Tú';
  if (rivalProjection > myProjection) winner = rivalRow?.display_name || 'Rival';

  const diff = myProjection - rivalProjection;
  let note = 'Duelo muy ajustado.';
  if (diff > 3) note = 'Tendencia positiva para ti si mantienes el ritmo.';
  if (diff < -3) note = 'Necesitas un impulso para remontar.';

  const weakestHabit = habits.length ? habits[0].name : '';

  return {
    winner,
    myProjection,
    rivalProjection,
    note,
    weakestHabit
  };
}
