/* =====================================================================
   App.jsx — session gate, simple router, toasts
   ===================================================================== */
import { useCallback, useEffect, useState } from 'react';
import { Store, useCourtData } from './data/store';
import { isAdmin, uid } from './engine/core';
import { Logo } from './ui/primitives';
import { Toasts } from './ui/Toasts';
import { AuthScreen } from './features/auth/AuthScreen';
import { TopNav } from './features/layout/TopNav';
import { Home } from './features/player/Home';
import { TournamentView } from './features/tournament/TournamentView';
import { Scorekeeper } from './features/score/Scorekeeper';
import { Leaderboard } from './features/rankings/Leaderboard';
import { AdminConsole } from './features/admin/AdminConsole';

function Splash({ text }) {
  return <div className="min-h-screen grid place-items-center"><div className="text-center"><Logo size="lg" /><p className="text-mute mt-4">{text}</p></div></div>;
}

export default function App() {
  const [route, setRoute] = useState({ name: 'home' });
  const [toasts, setToasts] = useState([]);
  const toast = useCallback(msg => {
    const id = uid('toast'); setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const go = useCallback((name, params = {}) => { setRoute({ name, ...params }); window.scrollTo(0, 0); }, []);
  const { session, state, loaded, dispatch } = useCourtData(toast);
  const me = session ? state.users[session.user.id] : null;
  useEffect(() => { if (route.name === 'admin' && me && !isAdmin(me)) setRoute({ name: 'home' }); }, [route, me]);

  const ctx = { state, dispatch, me, go, toast };
  let body;
  if (session === undefined) body = <Splash text="Loading…" />;
  else if (!session) body = <AuthScreen />;
  else if (!me) body = <Splash text={loaded ? 'Setting up your account…' : 'Loading tournaments…'} />;
  else {
    let page;
    if (route.name === 'tournament') page = <TournamentView key={route.tid} tid={route.tid} />;
    else if (route.name === 'score') page = <Scorekeeper key={route.mid} tid={route.tid} mid={route.mid} />;
    else if (route.name === 'leaderboard') page = <Leaderboard />;
    else if (route.name === 'admin' && isAdmin(me)) page = <AdminConsole />;
    else page = <Home />;
    body = <><TopNav route={route} />{page}</>;
  }
  return <Store.Provider value={ctx}>{body}<Toasts items={toasts} /></Store.Provider>;
}
