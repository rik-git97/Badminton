/* =====================================================================
   features/auth/AuthScreen.jsx — email + password sign up and log in (Supabase Auth)
   Requires "Confirm email" to be OFF in Supabase (Authentication → Sign In / Providers → Email),
   so new accounts can log in straight away without an email.
   ===================================================================== */
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Btn, Field, Segmented, Logo } from '../../ui/primitives';
import { CourtArt } from '../../ui/CourtArt';

const MIN_PASSWORD = 8;

function friendly(error) {
  const m = error?.message || '';
  if (/invalid login credentials/i.test(m)) return { field: 'password', msg: 'Email or password is wrong.' };
  if (/already registered|already exists/i.test(m)) return { field: 'email', msg: 'This email already has an account. Log in instead.' };
  if (/email not confirmed/i.test(m)) return { field: 'password', msg: 'This account is waiting for email confirmation. An admin needs to turn off "Confirm email" in Supabase.' };
  if (/rate limit|too many/i.test(m)) return { field: 'password', msg: 'Too many attempts. Wait a minute and try again.' };
  if (/password/i.test(m)) return { field: 'password', msg: m };
  return { field: 'password', msg: m || 'Something went wrong. Try again.' };
}

export function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '', wantsAdmin: false });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErr({}); };
  const email = f.email.trim().toLowerCase();

  const signUp = async () => {
    const er = {};
    if (f.name.trim().split(/\s+/).length < 2) er.name = 'Enter your first and last name.';
    if (!/^\+?[\d\s()-]{7,18}$/.test(f.phone.trim())) er.phone = 'Enter a phone number with at least 7 digits.';
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter an email like name@example.com.';
    if (f.password.length < MIN_PASSWORD) er.password = `Use at least ${MIN_PASSWORD} characters.`;
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password: f.password,
      options: { data: { name: f.name.trim().replace(/\s+/g, ' '), phone: f.phone.trim(), wants_admin: f.wantsAdmin } }
    });
    setBusy(false);
    if (error) { const e = friendly(error); return setErr({ [e.field]: e.msg }); }
    // Supabase returns no session (and a user with no identities) when the email is taken or confirmation is still on
    if (data.user && data.user.identities && data.user.identities.length === 0) return setErr({ email: 'This email already has an account. Log in instead.' });
    if (!data.session) setNotice('Account created, but Supabase is still set to require email confirmation. Ask the admin to turn off "Confirm email", then log in.');
  };

  const logIn = async () => {
    const er = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter the email you signed up with.';
    if (!f.password) er.password = 'Enter your password.';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
    setBusy(false);
    if (error) { const e = friendly(error); setErr({ [e.field]: e.msg }); }
  };

  const submit = mode === 'signup' ? signUp : logIn;
  const onEnter = e => { if (e.key === 'Enter') submit(); };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 border-r border-line">
        <Logo size="lg" />
        <div>
          <h1 className="font-display font-bold text-6xl leading-[1.02] tracking-tight max-w-xl">Run the draw.<br />Call every rally.</h1>
          <p className="text-mute text-lg mt-5 max-w-md">Brackets, live scoring and rankings for club badminton tournaments, in one place.</p>
          <CourtArt serve={{ side: 'left', box: 'right' }} className="w-full max-w-lg mt-10" />
        </div>
        <span />
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo size="lg" /></div>
          <Segmented value={mode} onChange={m => { setMode(m); setErr({}); setNotice(''); }} options={[['login', 'Log in'], ['signup', 'Sign up']]} />

          {notice && <div className="mt-6 rounded-xl border border-volt/40 bg-volt/[.06] px-4 py-3 text-sm">{notice}</div>}

          {mode === 'signup' ? (
            <div className="mt-7 space-y-4" onKeyDown={onEnter}>
              <h2 className="font-display text-3xl font-bold">Create your account</h2>
              <Field label="Full name" autoComplete="name" placeholder="Alex Andersson" value={f.name} onChange={set('name')} error={err.name} />
              <Field label="Phone number" type="tel" autoComplete="tel" placeholder="+46 70 123 45 67" value={f.phone} onChange={set('phone')} error={err.phone} hint="Only admins can see it." />
              <Field label="Email address" type="email" autoComplete="email" placeholder="alex@example.com" value={f.email} onChange={set('email')} error={err.email} />
              <Field label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={err.password} hint={`At least ${MIN_PASSWORD} characters.`} />
              <fieldset>
                <legend className="text-sm font-semibold mb-1.5">I'm signing up to</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[[false, 'Play', 'Join tournaments and track your ranking.'], [true, 'Run tournaments', 'Request admin access. An admin reviews it.']].map(([v, t, d]) => (
                    <button key={t} type="button" onClick={() => setF({ ...f, wantsAdmin: v })} aria-pressed={f.wantsAdmin === v}
                      className={`text-left p-3.5 rounded-xl border transition ${f.wantsAdmin === v ? 'border-lime bg-lime/[.06]' : 'border-line hover:border-mute/50'}`}>
                      <span className={`block font-bold ${f.wantsAdmin === v ? 'text-lime' : ''}`}>{t}</span>
                      <span className="block text-xs text-mute mt-1 leading-snug">{d}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <Btn size="lg" className="w-full" disabled={busy} onClick={signUp}>{busy ? 'Creating account…' : 'Create account'}</Btn>
            </div>
          ) : (
            <div className="mt-7 space-y-4" onKeyDown={onEnter}>
              <h2 className="font-display text-3xl font-bold">Welcome back</h2>
              <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set('email')} error={err.email} />
              <Field label="Password" type="password" autoComplete="current-password" value={f.password} onChange={set('password')} error={err.password} />
              <Btn size="lg" className="w-full" disabled={busy} onClick={logIn}>{busy ? 'Logging in…' : 'Log in'}</Btn>
              <p className="text-xs text-mute">Forgot your password? Ask a tournament admin to reset it.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
