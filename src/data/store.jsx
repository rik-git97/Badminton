/* =====================================================================
   data/store.jsx — Supabase data layer
   Loads every table the UI needs, reshapes rows into the app's model,
   refreshes on Realtime changes, and turns UI actions into DB writes/RPCs.
   ===================================================================== */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { generateSE, generateRR, generateGroups, generateKnockout } from '../engine/bracket';
import { teamRating, unpairedOf } from '../engine/core';

export const Store = createContext(null);
export const useStore = () => useContext(Store);

const EMPTY = { users: {}, tournaments: [], feed: [] };
const TABLES = ['profiles', 'contacts', 'tournaments', 'teams', 'matches', 'entrants'];
const REALTIME_TABLES = ['profiles', 'tournaments', 'teams', 'matches', 'entrants'];

/* DB rows -> the shape the components use */
function assemble({ profiles, contacts, tournaments, teams, matches, entrants }) {
  const contactOf = Object.fromEntries(contacts.map(c => [c.user_id, c]));
  const users = Object.fromEntries(profiles.map(p => [p.id, {
    id: p.id, name: p.name, email: contactOf[p.id]?.email || '', phone: contactOf[p.id]?.phone || '',
    role: p.role, adminStatus: p.admin_status, rating: p.rating, wins: p.wins, losses: p.losses, pf: p.pf, pa: p.pa, lastDelta: p.last_delta
  }]));
  const byT = (rows, key = 'tournament_id') => rows.reduce((acc, r) => ((acc[r[key]] ||= []).push(r), acc), {});
  const eT = byT(entrants), tmT = byT(teams), mT = byT(matches);
  const ts = tournaments.map(t => ({
    id: t.id, name: t.name, date: t.date, venue: t.venue || '', format: t.format, type: t.type, maxEntries: t.max_entries, status: t.status,
    regClosed: t.reg_closed, regDeadline: t.reg_deadline || '', champion: t.champion_team, endedManually: t.ended_manually,
    entrants: (eT[t.id] || []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(e => e.user_id),
    teams: (tmT[t.id] || []).sort((a, b) => a.seed - b.seed).map(x => ({ id: x.id, name: x.name || undefined, playerIds: x.player_ids || [] })),
    matches: (mT[t.id] || []).map(m => ({
      id: m.id, round: m.round, slot: m.slot, a: m.team_a, b: m.team_b, games: m.games || [], winner: m.winner, status: m.status,
      next: m.next_match ? { id: m.next_match, side: m.next_side } : null, live: m.live, group: m.grp || undefined, stage: m.stage || undefined,
      outcome: m.outcome, note: m.note, partial: m.partial
    }))
  }));
  const feed = matches.filter(m => m.status === 'done' && m.finished_at && m.winner)
    .sort((a, b) => b.finished_at.localeCompare(a.finished_at)).slice(0, 12)
    .map(m => ({ id: m.id, tid: m.tournament_id, winner: m.winner, loser: m.winner === m.team_a ? m.team_b : m.team_a,
      games: m.winner === m.team_a ? (m.games || []) : (m.games || []).map(([x, y]) => [y, x]) }));
  return { users, tournaments: ts, feed };
}

/* app match -> DB row (without tournament_id) */
const matchRow = m => ({
  id: m.id, round: m.round, slot: m.slot, grp: m.group || null, stage: m.stage || null, team_a: m.a, team_b: m.b,
  games: m.games || [], winner: m.winner, status: m.status, next_match: m.next?.id || null, next_side: m.next?.side || null
});

export function useCourtData(toast) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [state, setState] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state); stateRef.current = state;

  const load = useCallback(async () => {
    const res = await Promise.all(TABLES.map(t => supabase.from(t).select('*')));
    const bad = res.find(r => r.error);
    if (bad) { toast(`Couldn't load data: ${bad.error.message}`); return null; }
    const data = Object.fromEntries(TABLES.map((t, i) => [t, res[i].data]));
    const next = assemble(data);
    setState(next); setLoaded(true);
    return next;
  }, [toast]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const uidNow = session?.user?.id;
  useEffect(() => {
    if (!uidNow) { setState(EMPTY); setLoaded(false); return; }
    let cancelled = false, timer, tries = 0;
    // A brand-new account's profile is created by a DB trigger; retry briefly until it appears
    const first = async () => { const s = await load(); if (!cancelled && s && !s.users[uidNow] && tries++ < 10) timer = setTimeout(first, 700); };
    first();
    const refresh = () => { clearTimeout(timer); timer = setTimeout(load, 150); };
    const ch = supabase.channel('courtvision-db');
    REALTIME_TABLES.forEach(table => ch.on('postgres_changes', { event: '*', schema: 'public', table }, refresh));
    ch.subscribe();
    return () => { cancelled = true; clearTimeout(timer); supabase.removeChannel(ch); };
  }, [uidNow, load]);

  const dispatch = useCallback(async a => {
    const s = stateRef.current;
    const T = id => s.tournaments.find(t => t.id === id);
    const ok = r => { if (r?.error) throw r.error; return r; };
    const tUpdate = (tid, patch) => supabase.from('tournaments').update(patch).eq('id', tid);
    try {
      switch (a.type) {
        case 'LOGOUT': await supabase.auth.signOut(); return;
        case 'ADMIN_DECISION':
          ok(await supabase.from('profiles').update({ role: a.approve ? 'admin' : 'player', admin_status: a.approve ? 'approved' : 'denied' }).eq('id', a.id)); break;
        case 'CREATE_T': {
          const d = a.data;
          ok(await supabase.from('tournaments').insert({ name: d.name, date: d.date, venue: d.venue, format: d.format, type: d.type,
            max_entries: d.maxEntries, reg_deadline: d.regDeadline || null, created_by: uidNow })); break;
        }
        case 'UPDATE_T': ok(await tUpdate(a.tid, { name: a.data.name, venue: a.data.venue, date: a.data.date })); break;
        case 'JOIN': ok(await supabase.rpc('join_tournament', { p_tournament: a.tid })); break;
        case 'LEAVE': ok(await supabase.rpc('leave_tournament', { p_tournament: a.tid })); break;
        case 'SET_REG': ok(await tUpdate(a.tid, { reg_closed: a.closed, ...(a.clearDeadline ? { reg_deadline: null } : {}) })); break;
        case 'SET_LIMIT': ok(await tUpdate(a.tid, { max_entries: Math.max(a.limit, T(a.tid).entrants.length) })); break;
        case 'PAIR': ok(await supabase.from('teams').insert({ tournament_id: a.tid, player_ids: a.ids, seed: T(a.tid).teams.length + 1 })); break;
        case 'UNPAIR': ok(await supabase.from('teams').delete().eq('id', a.teamId)); break;
        case 'AUTO_PAIR': {
          const t = T(a.tid), pool = unpairedOf(t).sort((x, y) => s.users[y].rating - s.users[x].rating), rows = [];
          let seed = t.teams.length;
          while (pool.length >= 2) rows.push({ tournament_id: t.id, player_ids: [pool.shift(), pool.pop()], seed: ++seed });
          if (rows.length) ok(await supabase.from('teams').insert(rows));
          break;
        }
        case 'MOVE_SEED': {
          const ids = T(a.tid).teams.map(x => x.id), j = a.idx + a.dir;
          if (j < 0 || j >= ids.length) return;
          [ids[a.idx], ids[j]] = [ids[j], ids[a.idx]];
          ok(await supabase.rpc('set_team_seeds', { p_tournament: a.tid, p_team_ids: ids })); break;
        }
        case 'AUTO_SEED': {
          const ids = [...T(a.tid).teams].sort((x, y) => teamRating(y, s.users) - teamRating(x, s.users)).map(x => x.id);
          ok(await supabase.rpc('set_team_seeds', { p_tournament: a.tid, p_team_ids: ids })); break;
        }
        case 'RENAME_TEAM': ok(await supabase.from('teams').update({ name: a.name || null }).eq('id', a.teamId)); break;
        case 'GENERATE': {
          const t = T(a.tid);
          const ms = t.type === 'SE' ? generateSE(t.teams) : t.type === 'GK' ? generateGroups(t.teams) : generateRR(t.teams);
          ok(await supabase.rpc('replace_matches', { p_tournament: t.id, p_matches: ms.map(matchRow), p_status: 'live' })); break;
        }
        case 'RESET_BRACKET': ok(await supabase.rpc('replace_matches', { p_tournament: a.tid, p_matches: [], p_status: 'open' })); break;
        case 'KNOCKOUT': {
          const t = T(a.tid); if (t.matches.some(m => !m.group)) return;
          ok(await supabase.from('matches').insert(generateKnockout(t).map(m => ({ ...matchRow(m), tournament_id: t.id })))); break;
        }
        case 'LIVE': // every rally: skip the full reload, Realtime brings it back
          ok(await supabase.from('matches').update({ live: a.live, status: 'live' }).eq('id', a.mid)); return;
        case 'DISCARD_LIVE': ok(await supabase.from('matches').update({ live: null, status: 'pending' }).eq('id', a.mid)); break;
        case 'RESULT':
          ok(await supabase.rpc('record_result', { p_match: a.mid, p_games: a.games, p_winner_side: a.opts?.winnerSide ?? null, p_outcome: a.opts?.outcome ?? null })); break;
        case 'END_T':
          ok(await tUpdate(a.tid, { status: 'completed', champion_team: a.champion || null, ended_manually: true, reg_closed: true }));
          ok(await supabase.from('matches').update({ status: 'pending', live: null }).eq('tournament_id', a.tid).eq('status', 'live')); break;
        case 'CANCEL_T': ok(await tUpdate(a.tid, { status: 'cancelled' })); break;
        case 'REOPEN_T': {
          const t = T(a.tid);
          ok(await tUpdate(a.tid, { status: t.matches.length ? 'live' : 'open', champion_team: t.endedManually ? null : t.champion, ended_manually: false })); break;
        }
        case 'DELETE_T': ok(await supabase.from('tournaments').delete().eq('id', a.tid)); break;
        default: console.warn('Unknown action', a.type); return;
      }
      await load();
    } catch (e) {
      toast(e.message || 'Something went wrong. Try again.');
      load();
    }
  }, [load, toast, uidNow]);

  return { session, state, loaded, dispatch };
}
