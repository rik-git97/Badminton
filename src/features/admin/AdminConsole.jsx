import { useState } from 'react';
import { useStore } from '../../data/store';
import { LIMITS, addDays, fmtDate } from '../../engine/core';
import { IPlus } from '../../ui/icons';
import { Avatar, Btn, Card, Field, Segmented, statusChip } from '../../ui/primitives';

/* =====================================================================
   features/admin/AdminConsole.jsx
   ===================================================================== */
export function AdminConsole() {
  const { state, dispatch, go, toast } = useStore();
  const requests = Object.values(state.users).filter(u => u.adminStatus === 'pending');
  const live = state.tournaments.flatMap(t => t.matches.filter(m => m.status === 'live')).length;
  const toPlay = state.tournaments.flatMap(t => t.matches.filter(m => m.a && m.b && m.status === 'pending')).length;
  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Admin</h1>
        <p className="text-mute mt-1">{state.tournaments.filter(t => t.status !== 'completed').length} active tournaments, {toPlay} matches ready to play, {live} on court now.</p>
      </div>

      {requests.length > 0 && (
        <Card className="p-5 border-volt/40">
          <h2 className="font-display font-bold text-lg mb-3">Admin access requests</h2>
          <ul className="divide-y divide-line">
            {requests.map(u => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar user={u} />
                <div className="flex-1 min-w-0"><div className="font-semibold">{u.name}</div><div className="text-xs text-mute truncate">{u.email}, {u.phone}</div></div>
                <Btn size="sm" variant="ghost" onClick={() => { dispatch({ type: 'ADMIN_DECISION', id: u.id, approve: false }); toast(`Declined ${u.name}.`); }}>Decline</Btn>
                <Btn size="sm" onClick={() => { dispatch({ type: 'ADMIN_DECISION', id: u.id, approve: true }); toast(`${u.name} is now an admin.`); }}>Approve</Btn>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
        <CreateTournament />
        <Card className="p-5">
          <h2 className="font-display font-bold text-lg mb-3">Your tournaments</h2>
          <ul className="divide-y divide-line">
            {state.tournaments.map(t => {
              const done = t.matches.filter(m => m.status === 'done').length, total = t.matches.filter(m => m.status !== 'bye').length;
              return (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-xs text-mute mt-0.5">{fmtDate(t.date)}. {t.entrants.length} players. {total ? `${done}/${total} matches played.` : 'No bracket yet.'}</div>
                  </div>
                  {statusChip(t)}
                  <Btn size="sm" variant="ghost" onClick={() => go('tournament', { tid: t.id })}>Manage</Btn>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </main>
  );
}

export function CreateTournament() {
  const { dispatch, go, toast } = useStore();
  const [f, setF] = useState({ name: '', date: addDays(14), regDeadline: '', venue: '', format: 'singles', type: 'SE', maxEntries: 12 });
  const [err, setErr] = useState({});
  const create = () => {
    const er = {};
    if (f.name.trim().length < 3) er.name = 'Give the tournament a name of at least 3 characters.';
    if (!f.venue.trim()) er.venue = 'Add where it takes place.';
    if (!f.date) er.date = 'Pick a date.';
    if (f.regDeadline && f.date && f.regDeadline > f.date) er.regDeadline = 'Registration has to close on or before the tournament date.';
    setErr(er); if (Object.keys(er).length) return;
    dispatch({ type: 'CREATE_T', data: { ...f, name: f.name.trim(), venue: f.venue.trim() } });
    toast(`${f.name.trim()} created. Registration is open.`);
    setF({ ...f, name: '', venue: '' });
    go('home');
  };
  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-display font-bold text-lg">Create a tournament</h2>
      <Field label="Name" placeholder="Winter Smash 2026" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} error={err.name} />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} error={err.date} />
        <Field label="Venue" placeholder="Club hall, courts 1–4" value={f.venue} onChange={e => setF({ ...f, venue: e.target.value })} error={err.venue} />
      </div>
      <Field label="Registration closes (optional)" type="date" value={f.regDeadline} max={f.date} onChange={e => setF({ ...f, regDeadline: e.target.value })} error={err.regDeadline}
        hint="Leave empty to keep it open until you close it yourself or generate the bracket." />
      <div>
        <span className="block text-sm font-semibold mb-1.5">Event</span>
        <Segmented value={f.format} onChange={v => setF({ ...f, format: v })} options={[['singles', 'Singles'], ['doubles', 'Doubles']]} />
      </div>
      <div>
        <span className="block text-sm font-semibold mb-1.5">Bracket</span>
        <Segmented value={f.type} onChange={v => setF({ ...f, type: v })} options={[['SE', 'Single elimination'], ['RR', 'Round robin'], ['GK', 'Groups + knockout']]} />
        <p className="text-xs text-mute mt-1.5">{{ SE: 'Lose once and you are out. Fast, suits big draws.', RR: 'Everyone plays everyone. Best for groups of 3–8.', GK: 'Two round-robin groups, then semifinals and a final. Needs at least 4 teams.' }[f.type]}</p>
      </div>
      <div>
        <span className="block text-sm font-semibold mb-1.5">Player limit</span>
        <Segmented value={String(f.maxEntries)} onChange={v => setF({ ...f, maxEntries: +v })} options={LIMITS.map(n => [String(n), String(n)])} />
      </div>
      <Btn size="lg" className="w-full" onClick={create}><IPlus />Create tournament</Btn>
    </Card>
  );
}
