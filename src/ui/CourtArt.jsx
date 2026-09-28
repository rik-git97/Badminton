/* =====================================================================
   ui/CourtArt.jsx — top-down court with serve boxes (used on auth + scorekeeper)
   ===================================================================== */
export function CourtArt({ serve, className = '' }) {
  // serve: { side: 'left'|'right' (half of court the server stands in), box: 'right'|'left' (server's own service court) }
  // Left-half player faces right: their right service court is the bottom box. Right-half player faces left: their right is the top box.
  const W = 440, H = 200, pad = 10, net = W / 2, sl = 36, lw = 2;
  const boxRect = (half, which) => {
    const top = (half === 'left') ? which === 'left' : which === 'right';
    const x = half === 'left' ? pad + 14 : net + sl;
    const w = (half === 'left' ? net - sl : W - pad - 14) - x;
    return { x, y: top ? pad + 8 : H / 2, w, h: H / 2 - pad - 8 };
  };
  const srv = serve && boxRect(serve.side, serve.box);
  const rcv = serve && boxRect(serve.side === 'left' ? 'right' : 'left', serve.box);
  const shuttle = srv && { x: serve.side === 'left' ? srv.x + srv.w * .45 : srv.x + srv.w * .55, y: srv.y + srv.h / 2 };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={serve ? `Serving from the ${serve.box} service court` : 'Badminton court'}>
      <rect x="0" y="0" width={W} height={H} rx="14" fill="#0E2A1F" />
      {srv && <rect x={srv.x} y={srv.y} width={srv.w} height={srv.h} fill="#FFE14A" opacity=".22" />}
      {rcv && <rect x={rcv.x} y={rcv.y} width={rcv.w} height={rcv.h} fill="#CCFF33" opacity=".08" />}
      <g stroke="#CCFF33" strokeWidth={lw} fill="none" opacity=".85">
        <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} />
        <line x1={pad} x2={W - pad} y1={pad + 8} y2={pad + 8} /><line x1={pad} x2={W - pad} y1={H - pad - 8} y2={H - pad - 8} />
        <line x1={pad + 14} x2={pad + 14} y1={pad} y2={H - pad} /><line x1={W - pad - 14} x2={W - pad - 14} y1={pad} y2={H - pad} />
        <line x1={net - sl} x2={net - sl} y1={pad} y2={H - pad} /><line x1={net + sl} x2={net + sl} y1={pad} y2={H - pad} />
        <line x1={pad} x2={net - sl} y1={H / 2} y2={H / 2} /><line x1={net + sl} x2={W - pad} y1={H / 2} y2={H / 2} />
      </g>
      <line x1={net} x2={net} y1={pad - 4} y2={H - pad + 4} stroke="#EAF5EE" strokeWidth="3" strokeDasharray="2 3" />
      {shuttle && <g transform={`translate(${shuttle.x} ${shuttle.y})`}><circle r="11" fill="#FFE14A" /><circle r="4" fill="#050B08" /></g>}
    </svg>
  );
}
