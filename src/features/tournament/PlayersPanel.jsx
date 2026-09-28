import { useStore } from '../../data/store';
import { teamLabel, teamRating, unpairedOf } from '../../engine/core';
import { Avatar, Card, Chip } from '../../ui/primitives';

/* ---------- features/tournament/PlayersPanel.jsx ---------- */
export function PlayersPanel({ t }) {
  const { state, me } = useStore();
  const free = unpairedOf(t);
  if (!t.entrants.length && !t.teams.length) return <Card className="p-8 text-center text-mute">No one has joined yet.</Card>;
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {t.teams.map((tm, i) => (
          <Card key={tm.id} className={`p-4 flex items-center gap-3 ${tm.playerIds.includes(me.id) ? 'border-lime/40' : ''}`}>
            <span className="w-8 font-display text-lg font-bold text-mute tabular">{i + 1}</span>
            <div className="flex -space-x-2">{tm.playerIds.map(id => <Avatar key={id} user={state.users[id]} hl={id === me.id} />)}</div>
            <div className="min-w-0 flex-1"><div className="font-semibold truncate">{teamLabel(tm, state.users, t.format)}</div><div className="text-xs text-mute">{tm.playerIds.length ? `Rating ${teamRating(tm, state.users)}` : 'Players not linked'}</div></div>
          </Card>
        ))}
      </div>
      {t.format === 'doubles' && free.length > 0 && (
        <div>
          <h3 className="font-display font-bold mb-2">Waiting for a partner</h3>
          <div className="flex flex-wrap gap-2">{free.map(id => <Chip key={id} tone={id === me.id ? 'lime' : 'ink'}>{state.users[id].name}</Chip>)}</div>
        </div>
      )}
    </div>
  );
}
