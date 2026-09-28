import { useState } from 'react';
import { useStore } from '../../data/store';
import { dayParts, fmtDate, isAdmin, isRegOpen, teamLabel, teamOf, uid } from '../../engine/core';
import { rankedPlayers } from '../../engine/rankings';
import { ICheck, ITrophy } from '../../ui/icons';
import { Btn, Card, Chip, Segmented, formatChip, statusChip, typeChip } from '../../ui/primitives';

/* =====================================================================
   features/player/Home.jsx — dashboard + tournament browser
   ===================================================================== */
export function Home() {
  const { state, me, go } = useStore();
  const [filter, setFilter] = useState('all');
  const ranked = rankedPlayers(state.users), rank = ranked.findIndex(u => u.id === me.id) + 1;
  const ts = state.tournaments.filter(t => filter === 'all' || t.status === filter)
    .sort((a, b) => ({ live: 0, open: 1, completed: 2, cancelled: 3 }[a.status] - { live: 0, open: 1, completed: 2, cancelled: 3 }[b.status]) || a.date.localeCompare(b.date));
  const liveMatches = state.tournaments.flatMap(t => t.matches.filter(m => m.status === 'live').map(m => ({ t, m })));
  const mine = state.tournaments.filter(t => t.entrants.includes(me.id) && t.status !== 'completed');

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {me.adminStatus === 'pending' && (
        <div className="rounded-xl border border-volt/40 bg-volt/[.06] px-4 py-3 text-sm">
          <b className="text-volt">Admin request pending.</b> <span className="text-mute">You can join tournaments as a player while an admin reviews it.</span>
        </div>
      )}
      {me.adminStatus === 'denied' && (
        <div className="rounded-xl border border-line px-4 py-3 text-sm text-mute">Your admin request was declined. You can keep playing as a player.</div>
      )}

      <section className="grid md:grid-cols-[1.3fr_1fr] gap-5">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Hey {me.name.split(' ')[0]}.</h1>
          <p className="text-mute mt-2">{mine.length ? `You're entered in ${mine.length} ${mine.length === 1 ? 'tournament' : 'tournaments'}.` : 'Pick a tournament below and join the draw.'}</p>
          <div className="grid grid-cols-3 gap-3 mt-6 max-w-lg">
            {[['Rating', me.rating], ['Rank', `#${rank}`], ['Record', `${me.wins}–${me.losses}`]].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-line bg-surface px-4 py-3">
                <div className="text-xs text-mute">{l}</div>
                <div className="font-display text-2xl font-bold mt-0.5 tabular">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg">Recent results</h2>
            {liveMatches.length > 0 && <Chip tone="volt" live>{liveMatches.length} on court</Chip>}
          </div>
          <ul className="space-y-2.5">
            {liveMatches.map(({ t, m }) => (
              <li key={m.id}>
                <button onClick={() => go('score', { tid: t.id, mid: m.id })} className="w-full text-left text-sm flex items-center gap-2 hover:text-volt">
                  <span className="live-dot w-1.5 h-1.5 rounded-full bg-volt" />
                  <span className="truncate flex-1">{teamLabel(teamOf(t, m.a), state.users, t.format)} vs {teamLabel(teamOf(t, m.b), state.users, t.format)}</span>
                  <span className="font-mono text-volt tabular">{m.live?.cur.join('–')}</span>
                </button>
              </li>
            ))}
            {(state.feed || []).slice(0, 5).map(f => {
              const t = state.tournaments.find(x => x.id === f.tid); if (!t) return null;
              return (
                <li key={f.id} className="text-sm flex items-center gap-2">
                  <ICheck className="w-3.5 h-3.5 text-lime shrink-0" />
                  <span className="truncate flex-1"><b>{teamLabel(teamOf(t, f.winner), state.users, t.format)}</b> <span className="text-mute">beat</span> {teamLabel(teamOf(t, f.loser), state.users, t.format)}</span>
                  <span className="font-mono text-xs text-mute tabular">{f.games.map(g => g.join('-')).join(' ')}</span>
                </li>
              );
            })}
            {!liveMatches.length && !(state.feed || []).length && <li className="text-sm text-mute">No matches finished yet.</li>}
          </ul>
        </Card>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-display text-2xl font-bold">Tournaments</h2>
          <Segmented value={filter} onChange={setFilter} options={[['all', 'All'], ['open', 'Open'], ['live', 'In play'], ['completed', 'Completed']]} />
        </div>
        {ts.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{ts.map(t => <TournamentCard key={t.id} t={t} />)}</div>
        ) : <p className="text-mute">Nothing here yet. {isAdmin(me) && <button className="text-lime underline" onClick={() => go('admin')}>Create a tournament</button>}</p>}
      </section>
    </main>
  );
}

export function TournamentCard({ t }) {
  const { me, dispatch, go, toast, state } = useStore();
  const joined = t.entrants.includes(me.id), full = t.entrants.length >= t.maxEntries;
  const { day, mon } = dayParts(t.date);
  const champ = t.champion && teamOf(t, t.champion);
  return (
    <Card className={`p-5 flex flex-col ${joined ? 'border-lime/40' : ''}`}>
      <div className="flex gap-4">
        <div className="w-14 shrink-0 text-center rounded-xl bg-court border border-line py-2">
          <div className="font-display text-2xl font-bold leading-none">{day}</div>
          <div className="text-[11px] text-mute mt-1">{mon}</div>
        </div>
        <div className="min-w-0">
          <button onClick={() => go('tournament', { tid: t.id })} className="font-display text-xl font-bold leading-tight text-left hover:text-lime">{t.name}</button>
          <div className="text-sm text-mute mt-1 truncate">{t.venue}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4">{statusChip(t)}{formatChip(t)}{typeChip(t)}</div>
      {champ ? (
        <div className="mt-4 flex items-center gap-2 text-sm"><ITrophy className="w-4 h-4 text-volt" /><span className="text-mute">Won by</span><b>{teamLabel(champ, state.users, t.format)}</b></div>
      ) : (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-mute mb-1.5"><span>{t.entrants.length} of {t.maxEntries} players</span>{joined ? <span className="text-lime font-semibold">You're in</span> : isRegOpen(t) && t.regDeadline ? <span>Closes {fmtDate(t.regDeadline)}</span> : null}</div>
          <div className="h-1.5 rounded-full bg-bg overflow-hidden"><div className="h-full bg-lime" style={{ width: `${Math.min(100, t.entrants.length / t.maxEntries * 100)}%` }} /></div>
        </div>
      )}
      <div className="flex gap-2 mt-5 pt-4 border-t border-line mt-auto">
        {isRegOpen(t) ? (joined
          ? <Btn variant="ghost" className="flex-1" onClick={() => { dispatch({ type: 'LEAVE', tid: t.id, uid: me.id }); toast(`You left ${t.name}.`); }}>Leave</Btn>
          : <Btn className="flex-1" disabled={full} onClick={() => { dispatch({ type: 'JOIN', tid: t.id, uid: me.id }); toast(t.format === 'doubles' ? `Joined ${t.name}. The organiser will pair you with a partner.` : `Joined ${t.name}.`); }}>{full ? 'Draw is full' : 'Join tournament'}</Btn>
        ) : null}
        <Btn variant={isRegOpen(t) ? 'subtle' : 'primary'} className="flex-1" onClick={() => go('tournament', { tid: t.id })}>{t.status === 'open' ? 'Details' : 'View bracket'}</Btn>
      </div>
    </Card>
  );
}
