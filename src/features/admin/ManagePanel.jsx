import { useState } from 'react';
import { useStore } from '../../data/store';
import { LIMITS, fmtDate, isRegOpen, nextPow2, shortName, teamLabel, teamRating, todayISO, unpairedOf } from '../../engine/core';
import { rrStandings } from '../../engine/rankings';
import { IDown, IUp, IX } from '../../ui/icons';
import { Avatar, Btn, Card, ConfirmBtn, Field, Segmented, TYPE_LABEL } from '../../ui/primitives';

/* =====================================================================
   features/admin/ManagePanel.jsx — team builder, seeding, bracket generation
   ===================================================================== */
export function suggestChampion(t) {
  if (t.champion) return t.champion;
  if (t.type === 'RR' && t.matches.some(m => m.status === 'done')) return rrStandings(t)[0].teamId;
  return '';
}

export function StatusCard({ t }) {
  const { state, dispatch, toast, go } = useStore();
  const [champ, setChamp] = useState(suggestChampion(t));
  const active = t.status === 'open' || t.status === 'live';
  const unplayed = t.matches.filter(m => m.a && m.b && m.status !== 'done' && m.status !== 'bye').length;
  const finalists = t.matches.filter(m => m.stage === 'Final' || (t.type === 'SE' && !m.next)).flatMap(m => [m.a, m.b]).filter(Boolean);
  const options = [...t.teams].sort((a, b) => (finalists.includes(b.id) ? 1 : 0) - (finalists.includes(a.id) ? 1 : 0));
  return (
    <Card className="p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-md">
          <h3 className="font-display font-bold text-lg">Tournament status</h3>
          <p className="text-sm text-mute mt-0.5">{
            t.status === 'open' ? 'Taking registrations. Generate the bracket to start play.'
            : t.status === 'live' ? (unplayed ? `In play. ${unplayed} ${unplayed === 1 ? 'match is' : 'matches are'} still to be played.` : 'In play. Every scheduled match is finished.')
            : t.status === 'cancelled' ? 'Cancelled. Players can still see the results that were played.'
            : t.endedManually ? 'Ended by an admin.' : 'Finished. The final result decided the champion.'}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {active && <>
            <label className="block">
              <span className="block text-xs text-mute mb-1">Champion</span>
              <select value={champ} onChange={e => setChamp(e.target.value)} className="h-10 px-3 rounded-lg bg-bg border border-line text-sm text-ink outline-none focus:border-lime max-w-[220px]">
                <option value="">No champion</option>
                {options.map(tm => <option key={tm.id} value={tm.id}>{teamLabel(tm, state.users, t.format)}{finalists.includes(tm.id) ? ' (finalist)' : ''}</option>)}
              </select>
            </label>
            <ConfirmBtn variant="volt" confirmLabel={unplayed ? `End with ${unplayed} unplayed?` : 'Click again to end'}
              onConfirm={() => { dispatch({ type: 'END_T', tid: t.id, champion: champ }); toast('Tournament ended.'); }}>End tournament</ConfirmBtn>
            <ConfirmBtn variant="ghost" confirmLabel="Click again to cancel it" onConfirm={() => { dispatch({ type: 'CANCEL_T', tid: t.id }); toast('Tournament cancelled.'); }}>Cancel tournament</ConfirmBtn>
          </>}
          {!active && (t.status === 'cancelled' || t.endedManually) &&
            <Btn variant="ghost" onClick={() => { dispatch({ type: 'REOPEN_T', tid: t.id }); toast('Tournament reopened.'); }}>Reopen tournament</Btn>}
          <ConfirmBtn variant="danger" confirmLabel="Delete for good?" onConfirm={() => { dispatch({ type: 'DELETE_T', tid: t.id }); toast(`${t.name} deleted.`); go('home'); }}>Delete</ConfirmBtn>
        </div>
      </div>
    </Card>
  );
}

export function ManagePanel({ t, onGenerated }) {
  const { state, dispatch, toast } = useStore();
  const [sel, setSel] = useState([]);
  const users = state.users;
  const locked = t.matches.length > 0;
  const hasResults = t.matches.some(m => m.status === 'done' || m.status === 'live');
  const free = unpairedOf(t);
  const minTeams = { SE: 2, RR: 3, GK: 4 }[t.type];
  const [editing, setEditing] = useState(null);
  const [d, setD] = useState({ name: t.name, venue: t.venue, date: t.date });
  const n = t.teams.length, byes = t.type === 'SE' && n >= 2 ? nextPow2(n) - n : 0;
  const rrMatches = n * (n - 1) / 2;
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 2 ? [...s, id] : [s[1], id]);

  const generate = () => {
    dispatch({ type: 'GENERATE', tid: t.id }); toast('Bracket generated. Registration is now closed.'); onGenerated();
  };

  const regOpen = isRegOpen(t), deadlinePassed = t.regDeadline && todayISO() > t.regDeadline;
  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <Card className="p-5 lg:col-span-2 grid sm:grid-cols-[1.4fr_1fr_1.4fr_auto] gap-3 items-end">
        <Field label="Tournament name" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} />
        <Field label="Date" type="date" value={d.date} onChange={e => setD({ ...d, date: e.target.value })} />
        <Field label="Venue" value={d.venue} onChange={e => setD({ ...d, venue: e.target.value })} />
        <Btn variant="ghost" className="h-11" disabled={!d.name.trim() || !d.date || (d.name === t.name && d.venue === t.venue && d.date === t.date)}
          onClick={() => { dispatch({ type: 'UPDATE_T', tid: t.id, data: { name: d.name.trim(), venue: d.venue.trim(), date: d.date } }); toast('Details saved.'); }}>Save details</Btn>
      </Card>
      <StatusCard t={t} />
      {t.status === 'open' && (
        <Card className="p-5 lg:col-span-2 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-display font-bold text-lg">Registration {regOpen ? 'is open' : 'is closed'}</h3>
            <p className="text-sm text-mute">{t.entrants.length} of {t.maxEntries} places taken.{' '}
              {regOpen ? (t.regDeadline ? `Closes automatically on ${fmtDate(t.regDeadline)}.` : 'Stays open until you close it or generate the bracket.')
                : deadlinePassed && !t.regClosed ? `The close date (${fmtDate(t.regDeadline)}) has passed.` : 'Players can no longer join or leave.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2"><span className="text-sm text-mute">Limit</span>
              <Segmented value={String(t.maxEntries)} onChange={v => { if (+v < t.entrants.length) return toast(`${t.entrants.length} players have already joined, so the limit can't go below that.`); dispatch({ type: 'SET_LIMIT', tid: t.id, limit: +v }); }}
                options={[...new Set([...LIMITS, t.maxEntries])].sort((a, b) => a - b).map(n => [String(n), String(n)])} />
            </div>
            {regOpen
              ? <Btn variant="volt" onClick={() => { dispatch({ type: 'SET_REG', tid: t.id, closed: true }); toast('Registration closed.'); }}>Close registration</Btn>
              : <Btn variant="ghost" onClick={() => { dispatch({ type: 'SET_REG', tid: t.id, closed: false, clearDeadline: deadlinePassed }); toast('Registration reopened.'); }}>Reopen registration</Btn>}
          </div>
        </Card>
      )}
      {t.format === 'doubles' && (
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-display font-bold text-lg">Team builder</h3><p className="text-sm text-mute">Select two free agents to pair them, or auto-pair the pool by rating (strongest with weakest).</p></div>
            <div className="flex gap-2">
              <Btn variant="ghost" disabled={locked || free.length < 2} onClick={() => { dispatch({ type: 'AUTO_PAIR', tid: t.id }); setSel([]); toast('Free agents paired.'); }}>Auto-pair</Btn>
              <Btn disabled={locked || sel.length !== 2} onClick={() => { dispatch({ type: 'PAIR', tid: t.id, ids: sel }); setSel([]); toast('Team created.'); }}>Pair selected</Btn>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {free.length ? free.map(id => (
              <button key={id} disabled={locked} onClick={() => toggle(id)} aria-pressed={sel.includes(id)}
                className={`h-10 pl-1.5 pr-3.5 rounded-full border flex items-center gap-2 text-sm transition ${sel.includes(id) ? 'border-lime bg-lime/10 text-lime' : 'border-line hover:border-mute/60'}`}>
                <Avatar user={users[id]} size="sm" hl={sel.includes(id)} />{users[id].name}<span className="text-xs text-mute tabular">{users[id].rating}</span>
              </button>
            )) : <p className="text-sm text-mute">Everyone who joined is on a team.</p>}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="font-display font-bold text-lg">Seeding</h3>
          <Btn size="sm" variant="ghost" disabled={locked || n < 2} onClick={() => { dispatch({ type: 'AUTO_SEED', tid: t.id }); toast('Seeded by rating.'); }}>Seed by rating</Btn>
        </div>
        <p className="text-sm text-mute mb-4">{t.type === 'SE' ? 'Seed 1 and 2 are placed in opposite halves. Byes go to the top seeds.' : t.type === 'GK' ? 'Seeds are snaked into two groups: 1 and 4 in A, 2 and 3 in B, and so on.' : 'Seeding sets the order in the standings until matches are played.'} Click a team name to rename it.</p>
        {n ? (
          <ol className="space-y-1.5">
            {t.teams.map((tm, i) => (
              <li key={tm.id} className="flex items-center gap-2 h-11 px-2 rounded-lg bg-bg border border-line">
                <span className="w-7 text-center font-display font-bold text-lime tabular">{i + 1}</span>
                {editing === tm.id
                  ? <input autoFocus aria-label="Team name" defaultValue={tm.name || ''} placeholder={tm.playerIds.map(id => shortName(users[id].name)).join(' / ') || 'Team name'}
                      onBlur={e => { dispatch({ type: 'RENAME_TEAM', tid: t.id, teamId: tm.id, name: e.target.value.trim() }); setEditing(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      className="flex-1 min-w-0 h-8 px-2 rounded-md bg-surface2 border border-lime text-sm outline-none" />
                  : <button className="flex-1 min-w-0 truncate text-left text-sm font-semibold hover:text-lime" title="Rename team" onClick={() => setEditing(tm.id)}>{teamLabel(tm, users, t.format)}</button>}
                <span className="text-xs text-mute tabular mr-1">{teamRating(tm, users)}</span>
                {t.format === 'doubles' && !locked && <button className="p-1.5 text-mute hover:text-danger" aria-label="Split team" onClick={() => dispatch({ type: 'UNPAIR', tid: t.id, teamId: tm.id })}><IX /></button>}
                <button disabled={locked || i === 0} className="p-1.5 text-mute hover:text-ink disabled:opacity-20" aria-label="Move up" onClick={() => dispatch({ type: 'MOVE_SEED', tid: t.id, idx: i, dir: -1 })}><IUp /></button>
                <button disabled={locked || i === n - 1} className="p-1.5 text-mute hover:text-ink disabled:opacity-20" aria-label="Move down" onClick={() => dispatch({ type: 'MOVE_SEED', tid: t.id, idx: i, dir: 1 })}><IDown /></button>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-mute">No teams yet. {t.format === 'doubles' ? 'Pair the free agents above.' : 'Players appear here as they join.'}</p>}
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-lg">Bracket</h3>
        <dl className="grid grid-cols-2 gap-3 my-4 text-sm">
          <div className="rounded-lg bg-bg border border-line p-3"><dt className="text-mute text-xs">Format</dt><dd className="font-semibold mt-0.5">{TYPE_LABEL[t.type]}</dd></div>
          <div className="rounded-lg bg-bg border border-line p-3"><dt className="text-mute text-xs">Teams</dt><dd className="font-semibold mt-0.5 tabular">{n}</dd></div>
          <div className="rounded-lg bg-bg border border-line p-3"><dt className="text-mute text-xs">{t.type === 'SE' ? 'Byes' : t.type === 'GK' ? 'Groups' : 'Matches'}</dt><dd className="font-semibold mt-0.5 tabular">{t.type === 'SE' ? byes : t.type === 'GK' ? '2' : rrMatches}</dd></div>
          <div className="rounded-lg bg-bg border border-line p-3"><dt className="text-mute text-xs">{t.format === 'doubles' ? 'Unpaired players' : 'Entrants'}</dt><dd className="font-semibold mt-0.5 tabular">{t.format === 'doubles' ? free.length : t.entrants.length}</dd></div>
        </dl>
        {t.format === 'doubles' && free.length > 0 && !locked && <p className="text-xs text-volt mb-3">{free.length} unpaired {free.length === 1 ? 'player' : 'players'} will be left out of the draw.</p>}
        {t.status === 'completed' || t.status === 'cancelled' ? (
          <p className="text-sm text-mute">Reopen the tournament to change the draw.</p>
        ) : hasResults ? (
          <p className="text-sm text-mute">The draw is locked because matches have started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locked ? <ConfirmBtn disabled={n < minTeams} onConfirm={generate} confirmLabel="Click again to replace the draw">Regenerate bracket</ConfirmBtn>
              : <Btn disabled={n < minTeams} onClick={generate}>Generate bracket</Btn>}
            {locked && <Btn variant="danger" onClick={() => { dispatch({ type: 'RESET_BRACKET', tid: t.id }); toast('Bracket cleared. Registration is open again.'); }}>Clear and reopen</Btn>}
          </div>
        )}
        {n < minTeams && <p className="text-xs text-mute mt-2">Needs at least {minTeams} teams.</p>}
      </Card>
    </div>
  );
}
