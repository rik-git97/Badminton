import { useStore } from '../../data/store';
import { roundLabel } from '../../engine/bracket';
import { teamLabel, teamOf } from '../../engine/core';
import { rrStandings } from '../../engine/rankings';
import { Card } from '../../ui/primitives';
import { MatchCard } from './MatchCard';

/* ---------- features/tournament/BracketRR.jsx ---------- */
export function StandingsTable({ t, rows, matches, title = 'Standings', qualify = 1 }) {
  const { state, me } = useStore();
  const done = matches.filter(m => m.status === 'done').length;
  return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="font-display font-bold text-lg">{title}</h3>
          <span className="text-xs text-mute">{done} of {matches.length} matches played</span>
        </div>
        <div className="scroll-x">
          <table className="w-full text-sm tabular">
            <thead><tr className="text-mute text-xs text-right border-y border-line">
              <th className="text-left font-semibold px-5 py-2">Team</th><th className="font-semibold px-2">P</th><th className="font-semibold px-2">W</th><th className="font-semibold px-2">L</th>
              <th className="font-semibold px-2" title="Games won minus lost">Games</th><th className="font-semibold px-5" title="Points won minus lost">Pts</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const team = teamOf(t, r.teamId), mine = team.playerIds.includes(me.id), gd = r.GW - r.GL, pd = r.PF - r.PA;
                return (
                  <tr key={r.teamId} className={`border-b border-line/60 text-right ${mine ? 'bg-lime/[.05]' : ''}`}>
                    <td className="text-left px-5 py-2.5"><span className={`inline-block w-5 font-display font-bold ${i < qualify && r.P ? 'text-volt' : 'text-mute'}`}>{i + 1}</span><span className="font-semibold">{teamLabel(team, state.users, t.format)}</span></td>
                    <td className="px-2">{r.P}</td><td className="px-2 text-lime font-bold">{r.W}</td><td className="px-2">{r.L}</td>
                    <td className="px-2">{gd > 0 ? '+' : ''}{gd}</td><td className="px-5">{pd > 0 ? '+' : ''}{pd}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
  );
}

export function BracketRR({ t }) {
  const rounds = [...new Set(t.matches.map(m => m.round))].sort((a, b) => a - b);
  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
      <StandingsTable t={t} rows={rrStandings(t)} matches={t.matches} />
      <div className="space-y-6">
        {rounds.map(r => (
          <div key={r}>
            <h3 className="font-display font-bold mb-2.5">{roundLabel(t, r)}</h3>
            <div className="space-y-2.5">{t.matches.filter(m => m.round === r).map(m => <MatchCard key={m.id} t={t} m={m} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
