/* =====================================================================
   engine/rankings.js — standings, Elo ratings, result application
   ===================================================================== */
export function rrStandings(t) {
  const rows = Object.fromEntries(t.teams.map(tm => [tm.id, { teamId: tm.id, P: 0, W: 0, L: 0, GW: 0, GL: 0, PF: 0, PA: 0 }]));
  t.matches.filter(m => m.status === 'done').forEach(m => {
    const A = rows[m.a], B = rows[m.b]; if (!A || !B) return;
    A.P++; B.P++;
    m.games.forEach(([x, y]) => { A.PF += x; A.PA += y; B.PF += y; B.PA += x; if (x > y) { A.GW++; B.GL++; } else { B.GW++; A.GL++; } });
    if (m.winner === m.a) { A.W++; B.L++; } else { B.W++; A.L++; }
  });
  return Object.values(rows).sort((p, q) => q.W - p.W || (q.GW - q.GL) - (p.GW - p.GL) || (q.PF - q.PA) - (p.PF - p.PA));
}


export const rankedPlayers = users => Object.values(users).sort((a, b) => b.rating - a.rating || b.wins - a.wins);
