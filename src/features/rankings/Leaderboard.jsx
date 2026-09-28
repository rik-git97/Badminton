import { useState } from 'react';
import { useStore } from '../../data/store';
import { isAdmin } from '../../engine/core';
import { rankedPlayers } from '../../engine/rankings';
import { Avatar, Card, Chip, Segmented } from '../../ui/primitives';

/* =====================================================================
   features/rankings/Leaderboard.jsx
   ===================================================================== */
export function Leaderboard() {
  const { state, me } = useStore();
  const [scope, setScope] = useState('active');
  const all = rankedPlayers(state.users);
  const list = scope === 'active' ? all.filter(u => u.wins + u.losses > 0) : all;
  const podium = list.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Rankings</h1>
          <p className="text-mute mt-1">Elo rating, updated the moment a result is saved. Everyone starts at 1500.</p>
        </div>
        <Segmented value={scope} onChange={setScope} options={[['active', 'Played a match'], ['all', 'Everyone']]} />
      </div>

      {podium.length === 3 && (
        <div className="grid grid-cols-3 gap-3 items-end mt-8 max-w-2xl">
          {podiumOrder.map(u => {
            const pos = list.indexOf(u) + 1, h = { 1: 'h-44', 2: 'h-36', 3: 'h-28' }[pos];
            return (
              <div key={u.id} className="text-center">
                <Avatar user={u} size="lg" hl={u.id === me.id} />
                <div className="font-semibold text-sm mt-2 truncate">{u.name}</div>
                <div className="text-xs text-mute tabular">{u.rating}</div>
                <div className={`${h} mt-2 rounded-t-xl border border-b-0 flex items-start justify-center pt-3 font-display text-3xl font-bold ${pos === 1 ? 'bg-volt/[.12] border-volt/50 text-volt' : 'bg-surface border-line text-mute'}`}>{pos}</div>
              </div>
            );
          })}
        </div>
      )}

      <Card className="mt-6 overflow-hidden">
        <div className="scroll-x">
          <table className="w-full text-sm tabular">
            <thead><tr className="text-xs text-mute text-right border-b border-line">
              <th className="text-left font-semibold px-5 py-3 w-14">#</th><th className="text-left font-semibold py-3">Player</th>
              <th className="font-semibold px-3">Rating</th><th className="font-semibold px-3">Last</th><th className="font-semibold px-3">W–L</th>
              <th className="font-semibold px-3">Win rate</th><th className="font-semibold px-5">Point diff</th></tr></thead>
            <tbody>
              {list.map((u, i) => {
                const played = u.wins + u.losses, mine = u.id === me.id;
                return (
                  <tr key={u.id} className={`border-b border-line/60 text-right ${mine ? 'bg-lime/[.06]' : ''}`}>
                    <td className={`text-left px-5 py-3 font-display font-bold ${i < 3 ? 'text-volt' : 'text-mute'}`}>{i + 1}</td>
                    <td className="text-left py-3"><div className="flex items-center gap-2.5"><Avatar user={u} size="sm" hl={mine} /><span className="font-semibold">{u.name}</span>{isAdmin(u) && <Chip>Admin</Chip>}</div></td>
                    <td className="px-3 font-bold">{u.rating}</td>
                    <td className={`px-3 ${u.lastDelta > 0 ? 'text-lime' : u.lastDelta < 0 ? 'text-danger' : 'text-mute'}`}>{u.lastDelta > 0 ? `+${u.lastDelta}` : u.lastDelta < 0 ? u.lastDelta : '–'}</td>
                    <td className="px-3">{u.wins}–{u.losses}</td>
                    <td className="px-3">{played ? `${Math.round(u.wins / played * 100)}%` : '–'}</td>
                    <td className="px-5">{played ? (u.pf - u.pa > 0 ? '+' : '') + (u.pf - u.pa) : '–'}</td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan="7" className="px-5 py-8 text-center text-mute">No matches have been played yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
