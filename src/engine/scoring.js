/* =====================================================================
   engine/scoring.js — BWF rally scoring rules
   ===================================================================== */
export const GAME_TO = 21;
export const CAP = 30;
export const GAMES_TO_WIN = 2;
export const gameOver = (x, y) => (x >= GAME_TO && x - y >= 2) || x === CAP;
export const gamesWon = games => [games.filter(g => g[0] > g[1]).length, games.filter(g => g[1] > g[0]).length];
export const isGamePoint = (cur, s) => { const x = cur[s] + 1, y = cur[1 - s]; return gameOver(x, y); };
export const serveCourt = (sk) => sk.cur[sk.server] % 2 === 0 ? 'right' : 'left';
export function validateGames(games) {
  if (games.length < 2) return 'Enter at least two games.';
  const w = [0, 0];
  for (let i = 0; i < games.length; i++) {
    const [a, b] = games[i];
    if (w[0] === GAMES_TO_WIN || w[1] === GAMES_TO_WIN) return `Game ${i + 1} isn't needed. The match was decided in game ${i}.`;
    const hi = Math.max(a, b), lo = Math.min(a, b);
    const ok = (hi === GAME_TO && lo <= GAME_TO - 2) || (hi > GAME_TO && hi <= CAP && hi - lo === 2) || (hi === CAP && lo === CAP - 1);
    if (!ok) return `Game ${i + 1} (${a}–${b}) isn't a valid final score. Games go to 21, win by 2, capped at 30–29.`;
    w[a > b ? 0 : 1]++;
  }
  if (w[0] < GAMES_TO_WIN && w[1] < GAMES_TO_WIN) return 'Someone needs to win two games. Add the deciding game.';
  return null;
}
