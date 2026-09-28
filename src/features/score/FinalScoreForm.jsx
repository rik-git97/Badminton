import React, { useState } from 'react';
import { gamesWon, validateGames } from '../../engine/scoring';
import { Btn, Card } from '../../ui/primitives';

/* ---------- features/score/FinalScoreForm.jsx ---------- */
export function FinalScoreForm({ names, onSave }) {
  const [rows, setRows] = useState([['', ''], ['', ''], ['', '']]);
  const [err, setErr] = useState('');
  const setCell = (g, i, v) => { setErr(''); setRows(r => r.map((row, k) => k !== g ? row : row.map((c, j) => j === i ? v.replace(/\D/g, '').slice(0, 2) : c))); };
  const save = () => {
    const filled = rows.filter(r => r[0] !== '' || r[1] !== '');
    if (filled.some(r => r[0] === '' || r[1] === '')) return setErr('Fill in both scores for every game you enter.');
    const games = filled.map(r => [+r[0], +r[1]]);
    const e = validateGames(games); if (e) return setErr(e);
    onSave(games);
  };
  const decided = (() => { const g = rows.filter(r => r[0] !== '' && r[1] !== '').map(r => [+r[0], +r[1]]); return g.length >= 2 && !validateGames(g.slice(0, 2)) && gamesWon(g.slice(0, 2)).includes(2); })();
  return (
    <Card className="p-5 sm:p-6 max-w-xl">
      <div className="grid grid-cols-[72px_1fr_1fr] gap-3 items-center">
        <span />
        {names.map(n => <span key={n} className="font-display font-bold truncate">{n}</span>)}
        {rows.map((row, g) => (
          <React.Fragment key={g}>
            <span className={`text-sm ${g === 2 && decided ? 'text-mute/50' : 'text-mute'}`}>Game {g + 1}</span>
            {row.map((c, i) => (
              <input key={i} inputMode="numeric" aria-label={`Game ${g + 1}, ${names[i]}`} value={c} disabled={g === 2 && decided}
                onChange={e => setCell(g, i, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }}
                placeholder={g === 2 ? 'If needed' : '21'}
                className="h-12 w-full px-3 rounded-lg bg-bg border border-line font-mono text-xl font-bold tabular text-center outline-none focus:border-lime disabled:opacity-30 placeholder:text-sm placeholder:font-body placeholder:font-normal" />
            ))}
          </React.Fragment>
        ))}
      </div>
      {err && <p className="text-sm text-danger mt-4">{err}</p>}
      <Btn size="lg" className="w-full mt-5" onClick={save}>Save result</Btn>
      <p className="text-xs text-mute mt-2">Saving moves the winner into the next round and updates both players' rankings.</p>
    </Card>
  );
}
