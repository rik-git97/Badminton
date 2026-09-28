/* =====================================================================
   engine/utils.js
   ===================================================================== */
export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
/* Row ids are real UUIDs so they can be inserted into Postgres as-is */
export const newId = () => crypto.randomUUID();
export const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const fmtDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const dayParts = iso => { const d = new Date(iso + 'T12:00:00'); return { day: d.getDate(), mon: d.toLocaleDateString('en-GB', { month: 'short' }) }; };
export const initials = name => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const shortName = name => { const p = name.split(' '); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
export const isAdmin = u => u?.role === 'admin';
export const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
/* Registration is open until an admin closes it, the close date passes, or the draw is made */
export const isRegOpen = t => t.status === 'open' && !t.regClosed && (!t.regDeadline || todayISO() <= t.regDeadline);
export const LIMITS = [8, 10, 12, 14];
export const nextPow2 = n => { let p = 1; while (p < n) p *= 2; return p; };

/* Standard bracket seeding: 1v8, 4v5, 2v7, 3v6 ... top seeds meet as late as possible, byes go to top seeds */
export function seedOrder(size) { let o = [1, 2]; while (o.length < size) { const m = o.length * 2 + 1; o = o.flatMap(s => [s, m - s]); } return o; }

/* =====================================================================
   engine/teams.js
   ===================================================================== */
export const teamOf = (t, id) => t.teams.find(x => x.id === id);
export const seedOf = (t, id) => t.teams.findIndex(x => x.id === id) + 1;
export const teamRating = (team, users) => !team.playerIds.length ? 1500 : Math.round(team.playerIds.reduce((s, id) => s + users[id].rating, 0) / team.playerIds.length);
export const teamLabel = (team, users, format) => !team ? 'TBD' : team.name ? team.name
  : team.playerIds.map(id => format === 'doubles' ? shortName(users[id].name) : users[id].name).join(' / ');
export const unpairedOf = t => { const paired = new Set(t.teams.flatMap(x => x.playerIds)); return t.entrants.filter(id => !paired.has(id)); };
