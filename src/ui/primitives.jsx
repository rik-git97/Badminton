import { useState, useEffect } from 'react';
import { initials, isRegOpen } from '../engine/core';
import { IShuttle } from './icons';

/* =====================================================================
   ui/primitives.jsx
   ===================================================================== */
export function Btn({ variant = 'primary', size = 'md', className = '', ...p }) {
  const v = {
    primary: 'bg-lime text-bg font-bold hover:bg-[#dcff70] active:scale-[.98]',
    volt: 'bg-volt text-bg font-bold hover:brightness-110 active:scale-[.98]',
    ghost: 'text-ink border border-line hover:border-mute/60 hover:bg-surface2',
    subtle: 'bg-surface2 text-ink hover:bg-line',
    danger: 'text-danger border border-danger/40 hover:bg-danger/10'
  }[variant];
  const s = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }[size];
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-lg transition whitespace-nowrap disabled:opacity-35 disabled:pointer-events-none ${v} ${s} ${className}`} />;
}

export function Chip({ tone = 'mute', live = false, children }) {
  const t = {
    mute: 'border-line text-mute', lime: 'border-lime/30 text-lime bg-lime/[.06]', volt: 'border-volt/40 text-volt bg-volt/[.07]',
    danger: 'border-danger/40 text-danger bg-danger/[.07]', ink: 'border-line text-ink bg-surface2'
  }[tone];
  return <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-[11px] font-semibold ${t}`}>
    {live && <span className="live-dot w-1.5 h-1.5 rounded-full bg-current" />}{children}</span>;
}

/* Two-step confirm: browsers block confirm() inside the artifact frame */
export function ConfirmBtn({ onConfirm, confirmLabel = 'Click again to confirm', children, ...p }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const id = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(id); }, [armed]);
  return <Btn {...p} onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>{armed ? confirmLabel : children}</Btn>;
}

export const Card = ({ className = '', children, ...p }) => <div {...p} className={`bg-surface border border-line rounded-2xl ${className}`}>{children}</div>;

export function Field({ label, error, hint, ...p }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-ink mb-1.5">{label}</span>
      <input {...p} className={`w-full h-11 px-3.5 rounded-lg bg-bg border text-ink text-[15px] outline-none transition focus:border-lime ${error ? 'border-danger' : 'border-line'}`} />
      {error ? <span className="block text-xs text-danger mt-1.5">{error}</span> : hint ? <span className="block text-xs text-mute mt-1.5">{hint}</span> : null}
    </label>
  );
}

export function Avatar({ user, size = 'md', hl = false }) {
  const s = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' }[size];
  return <span className={`${s} shrink-0 rounded-full grid place-items-center font-display font-bold ${hl ? 'bg-lime text-bg' : 'bg-surface2 text-ink border border-line'}`}>{initials(user.name)}</span>;
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-bg border border-line" role="tablist">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`h-8 px-3.5 rounded-lg text-sm font-semibold transition ${value === v ? 'bg-surface2 text-lime' : 'text-mute hover:text-ink'}`}>{label}</button>
      ))}
    </div>
  );
}

export function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span className={`${big ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg bg-lime text-bg grid place-items-center`}><IShuttle className={big ? 'w-6 h-6' : 'w-5 h-5'} /></span>
      <span className={`font-display font-bold tracking-tight ${big ? 'text-2xl' : 'text-lg'}`}>CourtVision</span>
    </span>
  );
}

export const statusChip = t => t.status === 'live' ? <Chip tone="volt" live>In play</Chip> : t.status === 'open' ? (isRegOpen(t) ? <Chip tone="lime">Registration open</Chip> : <Chip tone="ink">Registration closed</Chip>) : t.status === 'cancelled' ? <Chip tone="danger">Cancelled</Chip> : <Chip>Completed</Chip>;
export const formatChip = t => <Chip tone="ink">{t.format === 'singles' ? 'Singles' : 'Doubles'}</Chip>;
export const TYPE_LABEL = { SE: 'Single elimination', RR: 'Round robin', GK: 'Groups + knockout' };
export const typeChip = t => <Chip tone="ink">{TYPE_LABEL[t.type]}</Chip>;
