import { useStore } from '../../data/store';
import { isAdmin } from '../../engine/core';
import { Avatar, Btn, Logo } from '../../ui/primitives';
import { Home } from '../player/Home';

/* =====================================================================
   layout/TopNav.jsx
   ===================================================================== */
export function TopNav({ route }) {
  const { me, go, dispatch, state } = useStore();
  const pending = Object.values(state.users).filter(u => u.adminStatus === 'pending').length;
  const tabs = [['home', 'Tournaments'], ['leaderboard', 'Rankings'], ...(isAdmin(me) ? [['admin', 'Admin']] : [])];
  const active = route.name === 'tournament' || route.name === 'score' ? 'home' : route.name;
  return (
    <header className="sticky z-30 bg-bg/85 backdrop-blur border-b border-line" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <button onClick={() => go('home')} aria-label="Home"><Logo /></button>
        <nav className="flex-1 flex gap-1 scroll-x">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => go(k)} className={`relative h-9 px-3 rounded-lg text-sm font-semibold transition ${active === k ? 'text-lime bg-surface2' : 'text-mute hover:text-ink'}`}>
              {l}{k === 'admin' && pending > 0 && <span className="ml-1.5 inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-volt text-bg text-[10px] font-bold">{pending}</span>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-sm font-semibold">{me.name}</div>
            <div className="text-[11px] text-mute">{isAdmin(me) ? 'Admin' : me.adminStatus === 'pending' ? 'Player, admin pending' : 'Player'}</div>
          </div>
          <Avatar user={me} hl />
          <Btn variant="subtle" size="sm" onClick={() => dispatch({ type: 'LOGOUT' })}>Log out</Btn>
        </div>
      </div>
    </header>
  );
}
