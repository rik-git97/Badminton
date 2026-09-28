import { useStore } from '../../data/store';
import { isAdmin, seedOf, teamLabel, teamOf } from '../../engine/core';
import { ICheck, IShuttle } from '../../ui/icons';
import { Btn, Chip } from '../../ui/primitives';

/* ---------- features/tournament/MatchCard.jsx ---------- */
export function MatchCard({ t, m }) {
  const { state, me, go, dispatch, toast } = useStore();
  const users = state.users;
  const games = m.status === 'done' ? m.games : (m.live?.games || []);
  const ready = m.a && m.b && (m.status === 'pending' || m.status === 'live');
  const mineTeam = [m.a, m.b].some(id => id && teamOf(t, id)?.playerIds.includes(me.id));

  const row = side => {
    const id = m[side], i = side === 'a' ? 0 : 1, team = id && teamOf(t, id);
    const won = m.status === 'done' && m.winner === id, lost = m.status === 'done' && m.winner !== id;
    const serving = m.status === 'live' && m.live && m.live.server === i;
    return (
      <div className={`flex items-center gap-2 px-3 h-10 ${lost ? 'text-mute' : ''}`}>
        <span className="w-4 text-[11px] text-mute tabular">{team ? seedOf(t, id) : ''}</span>
        <span className={`flex-1 truncate text-sm ${won ? 'font-bold' : ''}`}>
          {team ? teamLabel(team, users, t.format) : <span className="text-mute italic">{m.status === 'bye' ? 'Bye' : 'Awaiting winner'}</span>}
        </span>
        {serving && <IShuttle className="w-3.5 h-3.5 text-volt" />}
        {games.map((g, k) => <span key={k} className={`w-6 text-center font-mono text-xs tabular ${g[i] > g[1 - i] ? 'text-lime' : 'text-mute'}`}>{g[i]}</span>)}
        {m.status === 'live' && m.live && <span className="w-7 text-center font-mono text-sm font-bold text-volt tabular">{m.live.cur[i]}</span>}
        {won && m.outcome && <span className="text-[10px] font-semibold text-mute" title={m.outcome === 'walkover' ? 'Walkover' : 'Opponent retired or match stopped'}>{m.outcome === 'walkover' ? 'W/O' : 'RET'}</span>}
        {won && <ICheck className="w-4 h-4 text-lime" />}
      </div>
    );
  };

  return (
    <div className={`rounded-xl border bg-surface overflow-hidden ${m.status === 'live' ? 'border-volt/60' : mineTeam ? 'border-lime/40' : 'border-line'}`}>
      {row('a')}<div className="h-px bg-line" />{row('b')}
      {m.note && m.status !== 'done' && <p className="px-3 py-2 text-xs text-volt border-t border-line">{m.note}</p>}
      {(ready || m.status === 'bye') && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-line bg-bg/40">
          {m.status === 'live' ? <Chip tone="volt" live>Live</Chip> : m.status === 'bye' ? <Chip>Advances on bye</Chip> : <span className="text-[11px] text-mute px-1">Ready to play</span>}
          <span className="flex-1" />
          {ready && isAdmin(me) && t.status === 'live' && <>
            <Btn size="sm" onClick={() => go('score', { tid: t.id, mid: m.id })}>{m.status === 'live' ? 'Resume' : 'Score'}</Btn>
          </>}
          {m.status === 'live' && !isAdmin(me) && <Btn size="sm" variant="volt" onClick={() => go('score', { tid: t.id, mid: m.id })}>Watch</Btn>}
        </div>
      )}
    </div>
  );
}
