/* =====================================================================
   ui/icons.jsx
   ===================================================================== */
export const Icon = ({ d, className = 'w-4 h-4', fill = false, sw = 1.8 }) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const IShuttle = p => <Icon {...p} d={<><circle cx="12" cy="18.5" r="3" fill="currentColor" stroke="none" /><path d="M9.2 16.5 6 3.5h12l-3.2 13" /><path d="M10 3.5l1 13M14 3.5l-1 13M7.4 9h9.2" /></>} />;
export const ITrophy = p => <Icon {...p} d={<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" /></>} />;
export const IBack = p => <Icon {...p} d={<path d="M15 18l-6-6 6-6" />} />;
export const IUndo = p => <Icon {...p} d={<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>} />;
export const ISwap = p => <Icon {...p} d={<><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></>} />;
export const ICheck = p => <Icon {...p} d={<path d="M5 12.5 10 17 19 7" />} />;
export const IPlus = p => <Icon {...p} d={<path d="M12 5v14M5 12h14" />} />;
export const IUp = p => <Icon {...p} d={<path d="M6 15l6-6 6 6" />} />;
export const IDown = p => <Icon {...p} d={<path d="M6 9l6 6 6-6" />} />;
export const IDice = p => <Icon {...p} d={<><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /></>} />;
export const IX = p => <Icon {...p} d={<path d="M6 6l12 12M18 6 6 18" />} />;
