export function Toasts({ items }) {
  return (
    <div className="fixed z-50 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] space-y-2 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }} aria-live="polite">
      {items.map(t => <div key={t.id} className="toast-in rounded-xl bg-surface2 border border-lime/30 px-4 py-3 text-sm shadow-2xl shadow-black/50">{t.msg}</div>)}
    </div>
  );
}
