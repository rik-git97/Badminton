import { useState } from 'react';
import { useStore } from '../../data/store';
import { fmtDate, isAdmin, isRegOpen, teamLabel, teamOf, uid } from '../../engine/core';
import { IBack, IShuttle, ITrophy } from '../../ui/icons';
import { Btn, Card, Segmented, formatChip, statusChip, typeChip } from '../../ui/primitives';
import { ManagePanel } from '../admin/ManagePanel';
import { BracketGK } from './BracketGK';
import { BracketRR } from './BracketRR';
import { BracketSE } from './BracketSE';
import { PlayersPanel } from './PlayersPanel';

/* =====================================================================
   features/tournament/TournamentView.jsx
   ===================================================================== */
export function TournamentView({ tid }) {
  const { state, me, go } = useStore();
  const t = state.tournaments.find(x => x.id === tid);
  const [tab, setTab] = useState(() => t && t.matches.length ? 'bracket' : (isAdmin(me) ? 'manage' : 'players'));
  if (!t) return <main className="max-w-6xl mx-auto px-4 py-10 text-mute">This tournament no longer exists.</main>;
  const champ = t.champion && teamOf(t, t.champion);
  const tabs = [['bracket', 'Bracket'], ['players', t.format === 'doubles' ? 'Players & teams' : 'Players'], ...(isAdmin(me) ? [['manage', 'Manage']] : [])];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <button onClick={() => go('home')} className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink mb-4"><IBack />All tournaments</button>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">{t.name}</h1>
          <p className="text-mute mt-1">{fmtDate(t.date)}, {t.venue}</p>
          {t.status === 'open' && t.regDeadline && <p className="text-sm text-mute mt-0.5">{isRegOpen(t) ? `Registration closes ${fmtDate(t.regDeadline)}` : `Registration closed${t.regClosed ? '' : ` on ${fmtDate(t.regDeadline)}`}`}</p>}
          <div className="flex flex-wrap gap-1.5 mt-3">{statusChip(t)}{formatChip(t)}{typeChip(t)}</div>
        </div>
        {isRegOpen(t) && <JoinButton t={t} />}
      </div>

      {t.status === 'cancelled' && <div className="mt-6 rounded-2xl border border-danger/40 bg-danger/[.06] p-5 text-sm"><b className="text-danger">This tournament was cancelled.</b> <span className="text-mute">Results already played are kept.</span></div>}
      {t.status === 'completed' && !champ && <div className="mt-6 rounded-2xl border border-line p-5 text-sm text-mute">This tournament was ended without a champion.</div>}
      {champ && (
        <div className="mt-6 rounded-2xl border border-volt/40 bg-gradient-to-r from-volt/[.12] to-transparent p-5 flex items-center gap-4">
          <ITrophy className="w-10 h-10 text-volt" />
          <div><div className="text-sm text-mute">Champion</div><div className="font-display text-2xl font-bold">{teamLabel(champ, state.users, t.format)}</div></div>
        </div>
      )}

      <div className="mt-7 mb-5"><Segmented value={tab} onChange={setTab} options={tabs} /></div>
      {tab === 'bracket' && (!t.matches.length
        ? <EmptyBracket t={t} onManage={() => setTab('manage')} />
        : t.type === 'SE' ? <BracketSE t={t} /> : t.type === 'GK' ? <BracketGK t={t} /> : <BracketRR t={t} />)}
      {tab === 'players' && <PlayersPanel t={t} />}
      {tab === 'manage' && isAdmin(me) && <ManagePanel t={t} onGenerated={() => setTab('bracket')} />}
    </main>
  );
}

export function JoinButton({ t }) {
  const { me, dispatch, toast } = useStore();
  const joined = t.entrants.includes(me.id), full = t.entrants.length >= t.maxEntries;
  return joined
    ? <Btn variant="ghost" onClick={() => { dispatch({ type: 'LEAVE', tid: t.id, uid: me.id }); toast(`You left ${t.name}.`); }}>Leave tournament</Btn>
    : <Btn disabled={full} onClick={() => { dispatch({ type: 'JOIN', tid: t.id, uid: me.id }); toast(`Joined ${t.name}.`); }}>{full ? 'Draw is full' : 'Join tournament'}</Btn>;
}

export function EmptyBracket({ t, onManage }) {
  const { me } = useStore();
  return (
    <Card className="p-10 text-center">
      <IShuttle className="w-10 h-10 mx-auto text-mute" />
      <h3 className="font-display text-xl font-bold mt-3">The draw hasn't been made yet</h3>
      <p className="text-mute mt-1">{t.entrants.length} {t.entrants.length === 1 ? 'player has' : 'players have'} joined so far. The bracket appears here once the organiser generates it.</p>
      {isAdmin(me) && <Btn className="mt-5" onClick={onManage}>Build teams and bracket</Btn>}
    </Card>
  );
}
