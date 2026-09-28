import { useStore } from '../../data/store';
import { groupStandings } from '../../engine/bracket';
import { isAdmin } from '../../engine/core';
import { Btn, Card } from '../../ui/primitives';
import { StandingsTable } from './BracketRR';
import { MatchCard } from './MatchCard';

/* ---------- features/tournament/BracketGK.jsx ---------- */
export function BracketGK({ t }) {
  const { me, dispatch, toast } = useStore();
  const ko = t.matches.filter(m => !m.group);
  const groupDone = t.matches.filter(m => m.group).every(m => m.status === 'done');
  const col = (stage, title) => {
    const ms = ko.filter(m => m.stage === stage).sort((a, b) => a.slot - b.slot);
    return ms.length ? <div><h3 className="font-display font-bold mb-2.5">{title}</h3><div className="space-y-3">{ms.map(m => <MatchCard key={m.id} t={t} m={m} />)}</div></div> : null;
  };
  return (
    <div className="space-y-10">
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {['A', 'B'].map(g => {
          const ms = t.matches.filter(m => m.group === g).sort((a, b) => a.round - b.round);
          return (
            <div key={g} className="space-y-3">
              <StandingsTable t={t} rows={groupStandings(t, g)} matches={ms} title={`Group ${g}`} qualify={2} />
              <div className="space-y-2.5">{ms.map(m => <MatchCard key={m.id} t={t} m={m} />)}</div>
            </div>
          );
        })}
      </div>
      <div>
        <h2 className="font-display text-2xl font-bold">Knockout</h2>
        <p className="text-sm text-mute mt-1 mb-4">The top two in each group go through: A1 plays B2 and B1 plays A2. Third place in each group meet for 5th.</p>
        {ko.length ? (
          <div className="grid md:grid-cols-3 gap-5 items-start">{col('Semifinal', 'Semifinals')}{col('Final', 'Final')}{col('5th place', '5th place')}</div>
        ) : (
          <Card className="p-6">
            <p className="text-mute">{groupDone ? 'All group matches are finished.' : 'The knockout round can be created once every group match is finished.'}</p>
            {isAdmin(me) && <Btn className="mt-4" disabled={!groupDone} onClick={() => { dispatch({ type: 'KNOCKOUT', tid: t.id }); toast('Knockout round created.'); }}>Create knockout round</Btn>}
          </Card>
        )}
      </div>
    </div>
  );
}
