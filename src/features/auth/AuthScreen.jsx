/* =====================================================================
   features/auth/AuthScreen.jsx — passwordless email sign-in (Supabase OTP)
   ===================================================================== */
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Btn, Field, Segmented, Logo } from '../../ui/primitives';
import { CourtArt } from '../../ui/CourtArt';

export function AuthScreen() {
  const [mode, setMode] = useState('signup');
  const [step, setStep] = useState('form'); // form | code
  const [f, setF] = useState({ name: '', phone: '', email: '', wantsAdmin: false });
  const [loginEmail, setLoginEmail] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const email = (mode === 'signup' ? f.email : loginEmail).trim().toLowerCase();

  const sendCode = async () => {
    const er = {};
    if (mode === 'signup') {
      if (f.name.trim().split(/\s+/).length < 2) er.name = 'Enter your first and last name.';
      if (!/^\+?[\d\s()-]{7,18}$/.test(f.phone.trim())) er.phone = 'Enter a phone number with at least 7 digits.';
      if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter an email like name@example.com.';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) er.login = 'Enter the email you signed up with.';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode === 'signup',
        emailRedirectTo: window.location.origin,
        ...(mode === 'signup' ? { data: { name: f.name.trim().replace(/\s+/g, ' '), phone: f.phone.trim(), wants_admin: f.wantsAdmin } } : {})
      }
    });
    setBusy(false);
    if (error) {
      const msg = /signups not allowed|user not found/i.test(error.message) ? 'No account uses that email. Check the spelling or sign up.'
        : /rate limit|security purposes/i.test(error.message) ? 'Too many codes requested. Wait a minute and try again.' : error.message;
      return setErr(mode === 'signup' ? { email: msg } : { login: msg });
    }
    setCode(''); setStep('code');
  };

  const verify = async () => {
    if (!/^\d{6,10}$/.test(code.trim())) return setErr({ code: 'Enter the code from the email.' });
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setErr({ code: /expired|invalid/i.test(error.message) ? 'That code is wrong or has expired. Request a new one.' : error.message });
  };
  const onEnter = fn => e => { if (e.key === 'Enter') fn(); };

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

          {step === 'code' ? (
            <div className="space-y-4" onKeyDown={onEnter(verify)}>
              <h2 className="font-display text-3xl font-bold">Check your email</h2>
              <p className="text-mute">We sent a sign-in code to <b className="text-ink">{email}</b>. You can also open the link in that email.</p>
              <Field label="Code" inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="123456" value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 10)); setErr({}); }} error={err.code} />
              <Btn size="lg" className="w-full" disabled={busy} onClick={verify}>{busy ? 'Checking…' : mode === 'signup' ? 'Create account' : 'Log in'}</Btn>
              <div className="flex justify-between text-sm">
                <button className="text-mute hover:text-ink" onClick={() => { setStep('form'); setErr({}); }}>Use a different email</button>
                <button className="text-lime hover:underline disabled:opacity-40" disabled={busy} onClick={sendCode}>Send a new code</button>
              </div>
            </div>
          ) : <>
            <Segmented value={mode} onChange={m => { setMode(m); setErr({}); }} options={[['signup', 'Sign up'], ['login', 'Log in']]} />
            {mode === 'signup' ? (
              <div className="mt-7 space-y-4" onKeyDown={onEnter(sendCode)}>
                <h2 className="font-display text-3xl font-bold">Create your account</h2>
                <Field label="Full name" autoComplete="name" placeholder="Alex Andersson" value={f.name} onChange={set('name')} error={err.name} />
                <Field label="Phone number" type="tel" autoComplete="tel" placeholder="+46 70 123 45 67" value={f.phone} onChange={set('phone')} error={err.phone} hint="Only admins can see it." />
                <Field label="Email address" type="email" autoComplete="email" placeholder="alex@example.com" value={f.email} onChange={set('email')} error={err.email} hint="We'll email you a code. No password needed." />
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
                <Btn size="lg" className="w-full" disabled={busy} onClick={sendCode}>{busy ? 'Sending…' : 'Email me a code'}</Btn>
              </div>
            ) : (
              <div className="mt-7 space-y-4" onKeyDown={onEnter(sendCode)}>
                <h2 className="font-display text-3xl font-bold">Welcome back</h2>
                <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setErr({}); }} error={err.login} />
                <Btn size="lg" className="w-full" disabled={busy} onClick={sendCode}>{busy ? 'Sending…' : 'Email me a code'}</Btn>
              </div>
            )}
          </>}
        </div>
      </section>
    </div>
  );
}
