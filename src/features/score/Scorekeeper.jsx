import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../data/store';
import { roundLabel } from '../../engine/bracket';
import { isAdmin, teamLabel, teamOf } from '../../engine/core';
import { GAMES_TO_WIN, gameOver, gamesWon, isGamePoint, serveCourt } from '../../engine/scoring';
import { CourtArt } from '../../ui/CourtArt';
import { IBack, IShuttle, ISwap, IUndo } from '../../ui/icons';
import { Btn, Card, Chip, ConfirmBtn, Segmented } from '../../ui/primitives';
import { DecideForm } from './DecideForm';
import { FinalScoreForm } from './FinalScoreForm';

/* =====================================================================
   features/score/Scorekeeper.jsx — rally scoring, serve tracking, submit
   ===================================================================== */
export function Scorekeeper({ tid, mid }) {
  const { state, me, dispatch, go, toast } = useStore();
  const t = state.tournaments.find(x => x.id === tid), m = t?.matches.find(x => x.id === mid);
  const canScore = isAdmin(me) && m && m.status !== 'done' && t.status === 'live';
  const [sk, setSk] = useState(() => m?.live || { games: [], cur: [0, 0], server: 0 });
  const [hist, setHist] = useState([]);
  const [flip, setFlip] = useState(false);
  const [bump, setBump] = useState(null);
  const [mode, setMode] = useState('rally');

  // Spectators follow the stored live state
  const view = canScore ? sk : (m?.live || { games: m?.games || [], cur: [0, 0], server: 0 });
  const gw = gamesWon(view.games);
  const over = gw[0] === GAMES_TO_WIN || gw[1] === GAMES_TO_WIN;

  const commit = next => { setSk(next); dispatch({ type: 'LIVE', tid, mid, live: next }); };
  const point = useCallback(side => {
    if (!canScore || over) return;
    setHist(h => [...h, sk]);
    const cur = [...sk.cur]; cur[side]++;
    let next = { ...sk, cur, server: side };
    if (gameOver(cur[side], cur[1 - side])) {
      next = { games: [...sk.games, cur], cur: [0, 0], server: side };
      const won = gamesWon(next.games);
      toast(won[side] === GAMES_TO_WIN ? `Match to ${names[side]}. Check the score and save the result.` : `Game ${sk.games.length + 1} to ${names[side]}, ${cur[side]}–${cur[1 - side]}.`);
    }
    setBump(side); setTimeout(() => setBump(null), 230);
    commit(next);
  }, [sk, canScore, over]);
  const undo = () => { if (!hist.length) return; const prev = hist[hist.length - 1]; setHist(h => h.slice(0, -1)); commit(prev); };

  useEffect(() => {
    if (!canScore || mode !== 'rally') return;
    const onKey = e => {
      if (e.target.tagName === 'INPUT') return;
      const leftIdx = flip ? 1 : 0;
      if (e.key === 'ArrowLeft') point(leftIdx);
      if (e.key === 'ArrowRight') point(1 - leftIdx);
      if (e.key.toLowerCase() === 'z' || e.key === 'Backspace') undo();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });

  if (!t || !m) return <main className="max-w-6xl mx-auto px-4 py-10 text-mute">Match not found.</main>;
  const users = state.users;
  const A = teamOf(t, m.a), B = teamOf(t, m.b);
  const names = [teamLabel(A, users, t.format), teamLabel(B, users, t.format)];

  const court = serveCourt(view);
  const order = flip ? [1, 0] : [0, 1]; // order[0] is shown on the left half
  const serverHalf = order[0] === view.server ? 'left' : 'right';
  const lead = view.cur[0] === 11 && view.cur[1] < 11 ? 0 : view.cur[1] === 11 && view.cur[0] < 11 ? 1 : -1;
  const interval = lead !== -1 && view.server === lead;
  const flag = s => {
    if (over) return null;
    if (isGamePoint(view.cur, s)) return gw[s] === GAMES_TO_WIN - 1 ? 'Match point' : 'Game point';
    return null;
  };

  const submit = (games = view.games, opts) => {
    dispatch({ type: 'RESULT', tid, mid, games, opts });
    const w = opts ? opts.winnerSide : gamesWon(games)[0] > gamesWon(games)[1] ? 0 : 1;
    toast(`Result saved. ${names[w]} advances. Rankings updated.`);
    go('tournament', { tid });
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <button onClick={() => go('tournament', { tid })} className="inline-flex items-center gap-1 text-sm text-mute hover:text-ink"><IBack />{t.name}</button>
        <div className="flex items-center gap-2">
          <Chip tone="ink">{roundLabel(t, m.round, m)}</Chip>
          <Chip tone="ink">Game {Math.min(view.games.length + 1, 3)} of 3</Chip>
          {m.status === 'done' ? <Chip>Final</Chip> : <Chip tone="volt" live>Live</Chip>}
        </div>
      </div>

      {canScore && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Segmented value={mode} onChange={setMode} options={[['rally', 'Point by point'], ['final', 'Enter final score'], ['decide', 'Walkover or retired']]} />
          <span className="text-sm text-mute">{{ rally: 'Score live, rally by rally, from courtside.', final: 'Type in the game scores after the match.', decide: 'Pick a winner when the match was not finished.' }[mode]}</span>
        </div>
      )}
      {canScore && mode !== 'rally' ? (mode === 'final' ? <FinalScoreForm names={names} onSave={submit} />
        : <DecideForm names={names} games={m.partial || [...sk.games, ...(sk.cur[0] + sk.cur[1] > 0 ? [sk.cur] : [])]} onSave={submit} />) : <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {order.map(i => {
          const serving = view.server === i && !over, fl = flag(i);
          return (
            <button key={i} disabled={!canScore || over} onClick={() => point(i)}
              className={`relative text-left rounded-2xl border p-4 sm:p-6 min-h-[260px] sm:min-h-[340px] flex flex-col transition overflow-hidden
                ${serving ? 'border-volt/70 bg-gradient-to-b from-volt/[.09] to-surface' : 'border-line bg-surface'} ${canScore && !over ? 'hover:border-lime/70 active:scale-[.99] cursor-pointer' : 'cursor-default'}`}
              aria-label={canScore ? `Point to ${names[i]}` : names[i]}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-lg sm:text-2xl font-bold leading-tight break-words">{names[i]}</div>
                  <div className="flex gap-1.5 mt-2" aria-label={`${gw[i]} games won`}>
                    {[0, 1].map(k => <span key={k} className={`w-6 h-1.5 rounded-full ${k < gw[i] ? 'bg-lime' : 'bg-line'}`} />)}
                  </div>
                </div>
                {serving && <span className="shrink-0 inline-flex items-center gap-1 text-volt text-xs font-bold"><IShuttle className="w-4 h-4" />Serving</span>}
              </div>
              <div className={`font-mono font-bold tabular leading-none mt-auto text-[96px] sm:text-[160px] ${serving ? 'text-volt' : 'text-ink'} ${bump === i ? 'pop' : ''}`}>{view.cur[i]}</div>
              <div className="flex items-center justify-between mt-3 min-h-[24px]">
                {fl ? <Chip tone="danger">{fl}</Chip> : <span />}
                {canScore && !over && <span className="text-xs text-mute">Tap to add a point</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 mt-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold">Serve</h2>
            {!over && <span className="text-sm"><b className="text-volt">{names[view.server]}</b> <span className="text-mute">serves from the</span> <b>{court} court</b></span>}
          </div>
          <CourtArt serve={over ? null : { side: serverHalf, box: court }} className="w-full" />
          <p className="text-xs text-mute mt-2">Even score serves from the right, odd from the left. The rally winner serves next.</p>
          {interval && <p className="mt-2 text-sm text-volt font-semibold">{view.games.length === 2 ? 'Interval: 60 seconds, and players change ends.' : 'Interval: 60 seconds.'}</p>}
        </Card>

        <Card className="p-4 sm:p-5 flex flex-col">
          <h2 className="font-display font-bold mb-3">Games</h2>
          <div className="space-y-2 flex-1">
            {[0, 1, 2].map(g => {
              const sc = view.games[g] || (g === view.games.length && !over ? view.cur : null);
              return (
                <div key={g} className="flex items-center gap-3 h-10 px-3 rounded-lg bg-bg border border-line">
                  <span className="text-sm text-mute w-16">Game {g + 1}</span>
                  {sc ? <span className="font-mono font-bold tabular">
                    <span className={view.games[g] && sc[0] > sc[1] ? 'text-lime' : ''}>{sc[0]}</span><span className="text-mute"> – </span><span className={view.games[g] && sc[1] > sc[0] ? 'text-lime' : ''}>{sc[1]}</span>
                  </span> : <span className="text-mute text-sm">Not played</span>}
                  {g === view.games.length && !over && <span className="ml-auto text-xs text-volt">In progress</span>}
                </div>
              );
            })}
          </div>
          {canScore ? (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Btn variant="ghost" disabled={!hist.length} onClick={undo}><IUndo />Undo point</Btn>
                <Btn variant="ghost" onClick={() => setFlip(f => !f)}><ISwap />Swap ends</Btn>
              </div>
              <Btn size="lg" className="w-full" disabled={!over} onClick={() => submit()}>{over ? 'Save result' : 'Save result when the match ends'}</Btn>
              <ConfirmBtn variant="subtle" size="sm" className="w-full" confirmLabel="Click again to discard" onConfirm={() => { dispatch({ type: 'DISCARD_LIVE', tid, mid }); go('tournament', { tid }); }}>Discard match in progress</ConfirmBtn>
              <p className="hidden sm:block text-[11px] text-mute text-center">Keyboard: ← and → add points, Z undoes.</p>
            </div>
          ) : (
            <p className="text-sm text-mute mt-4">{m.status === 'done' ? 'This match is finished.' : 'You are watching. The score updates as the umpire enters points.'}</p>
          )}
        </Card>
      </div>
      </>}
    </main>
  );
}
