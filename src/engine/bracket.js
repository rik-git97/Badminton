import { newId, nextPow2, seedOrder } from './core';
import { rrStandings } from './rankings';

/* =====================================================================
   engine/bracket.js — Single Elimination + Round Robin generators
   ===================================================================== */
export function generateSE(teams) {
  const n = teams.length, size = nextPow2(n), order = seedOrder(size), rounds = Math.log2(size);
  const grid = [], matches = [];
  for (let r = 0; r < rounds; r++) {
    grid[r] = [];
    for (let i = 0; i < size / 2 ** (r + 1); i++) {
      const m = { id: newId(), round: r, slot: i, a: null, b: null, games: [], winner: null, status: 'pending', next: null, live: null };
      grid[r].push(m); matches.push(m);
    }
  }
  for (let r = 0; r < rounds - 1; r++) grid[r].forEach((m, i) => { m.next = { id: grid[r + 1][Math.floor(i / 2)].id, side: i % 2 === 0 ? 'a' : 'b' }; });
  grid[0].forEach((m, i) => {
    const sa = order[2 * i], sb = order[2 * i + 1];
    m.a = sa <= n ? teams[sa - 1].id : null;
    m.b = sb <= n ? teams[sb - 1].id : null;
  });
  // Byes: auto-advance
  grid[0].forEach(m => {
    if (!m.a || !m.b) {
      const w = m.a || m.b; m.winner = w; m.status = 'bye';
      if (m.next) matches.find(x => x.id === m.next.id)[m.next.side] = w;
    }
  });
  return matches;
}

/* Circle method: every team plays every other team once, grouped into rounds */
export function generateRR(teams) {
  const ids = teams.map(t => t.id); if (ids.length % 2) ids.push(null);
  const n = ids.length, matches = []; let arr = [...ids];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a && b) matches.push({ id: newId(), round: r, slot: i, a, b, games: [], winner: null, status: 'pending', next: null, live: null });
    }
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return matches;
}

/* Groups + knockout: snake-seed into groups A/B, round robin inside each, then A1–B2 and B1–A2 semifinals */
export function generateGroups(teams) {
  const A = [], B = [];
  teams.forEach((tm, i) => (i % 4 === 0 || i % 4 === 3 ? A : B).push(tm));
  const tag = (ms, g) => ms.map(m => ({ ...m, group: g, stage: `Group ${g}` }));
  return [...tag(generateRR(A), 'A'), ...tag(generateRR(B), 'B')];
}
export function groupStandings(t, g) {
  const ms = t.matches.filter(m => m.group === g), ids = new Set(ms.flatMap(m => [m.a, m.b]));
  return rrStandings({ teams: t.teams.filter(tm => ids.has(tm.id)), matches: ms });
}
export function generateKnockout(t) {
  const A = groupStandings(t, 'A').map(r => r.teamId), B = groupStandings(t, 'B').map(r => r.teamId);
  const mk = (stage, round, slot, a, b) => ({ id: newId(), round, slot, a, b, games: [], winner: null, status: 'pending', next: null, live: null, stage });
  const final = mk('Final', 2, 0, null, null);
  const out = [{ ...mk('Semifinal', 1, 0, A[0], B[1]), next: { id: final.id, side: 'a' } },
               { ...mk('Semifinal', 1, 1, B[0], A[1]), next: { id: final.id, side: 'b' } }, final];
  if (A[2] && B[2]) out.push(mk('5th place', 1, 2, A[2], B[2]));
  return out;
}

export function roundLabel(t, r, m) {
  if (m?.stage) return m.stage;
  if (t.type === 'RR') return `Round ${r + 1}`;
  const R = Math.max(...t.matches.map(m => m.round)) + 1, left = R - r;
  if (left === 1) return 'Final'; if (left === 2) return 'Semifinals'; if (left === 3) return 'Quarterfinals';
  return `Round of ${2 ** left}`;
}
