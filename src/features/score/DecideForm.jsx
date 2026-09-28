import { useState } from 'react';
import { Btn, Card, Segmented } from '../../ui/primitives';

/* ---------- features/score/DecideForm.jsx ---------- */
export function DecideForm({ names, games, onSave }) {
  const [winner, setWinner] = useState(null);
  const [outcome, setOutcome] = useState('retired');
  return (
    <Card className="p-5 sm:p-6 max-w-xl space-y-5">
      <div>
        <span className="block text-sm font-semibold mb-1.5">What happened</span>
        <Segmented value={outcome} onChange={setOutcome} options={[['retired', 'Retired or stopped'], ['walkover', 'Walkover']]} />
        <p className="text-xs text-mute mt-1.5">{outcome === 'retired'
          ? 'The match started but was not finished. Games played so far are kept and ratings change as normal.'
          : 'The match was never played. No games are recorded and ratings stay the same.'}</p>
      </div>
      {outcome === 'retired' && (
        <p className="text-sm">{games.length ? <>Games kept: <span className="font-mono tabular">{games.map(g => g.join('–')).join(', ')}</span> <span className="text-mute">({names[0]} first)</span></> : <span className="text-mute">No games were scored.</span>}</p>
      )}
      <div>
        <span className="block text-sm font-semibold mb-1.5">Winner</span>
        <div className="grid grid-cols-2 gap-3">
          {names.map((n, i) => (
            <button key={i} onClick={() => setWinner(i)} aria-pressed={winner === i}
              className={`p-3.5 rounded-xl border text-left font-bold transition ${winner === i ? 'border-lime bg-lime/[.08] text-lime' : 'border-line hover:border-mute/50'}`}>{n}</button>
          ))}
        </div>
      </div>
      <Btn size="lg" className="w-full" disabled={winner === null} onClick={() => onSave(outcome === 'retired' ? games : [], { winnerSide: winner, outcome })}>Save result</Btn>
    </Card>
  );
}
