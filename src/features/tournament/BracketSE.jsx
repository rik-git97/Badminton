import { useStore } from '../../data/store';
import { roundLabel } from '../../engine/bracket';
import { teamLabel, teamOf } from '../../engine/core';
import { ITrophy } from '../../ui/icons';
import { MatchCard } from './MatchCard';

/* ---------- features/tournament/BracketSE.jsx ---------- */
export function BracketSE({ t }) {
  const { state } = useStore();
  const R = Math.max(...t.matches.map(m => m.round)) + 1;
  const cols = [...Array(R)].map((_, r) => t.matches.filter(m => m.round === r).sort((a, b) => a.slot - b.slot));
  const h = Math.max(cols[0].length * 118, 260);
  const champ = t.champion && teamOf(t, t.champion);
  return (
    <div className="scroll-x -mx-4 px-4 pb-3">
      <div className="flex gap-8 min-w-max">
        {cols.map((ms, r) => (
          <div key={r} className="w-72 flex flex-col">
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h3 className="font-display font-bold">{roundLabel(t, r)}</h3>
              <span className="text-xs text-mute">{ms.filter(m => m.status === 'done' || m.status === 'bye').length}/{ms.length} done</span>
            </div>
            <div className="flex flex-col justify-around gap-3 flex-1" style={{ minHeight: h }}>
              {ms.map(m => <MatchCard key={m.id} t={t} m={m} />)}
            </div>
          </div>
        ))}
        <div className="w-52 flex flex-col">
          <h3 className="font-display font-bold mb-3 px-1">Champion</h3>
          <div className="flex-1 flex items-center" style={{ minHeight: h }}>
            <div className={`w-full rounded-xl border p-4 text-center ${champ ? 'border-volt/60 bg-volt/[.08]' : 'border-dashed border-line'}`}>
              <ITrophy className={`w-8 h-8 mx-auto ${champ ? 'text-volt' : 'text-mute'}`} />
              <div className={`font-display font-bold mt-2 ${champ ? '' : 'text-mute'}`}>{champ ? teamLabel(champ, state.users, t.format) : 'To be decided'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
