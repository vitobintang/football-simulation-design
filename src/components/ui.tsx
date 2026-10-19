"use client";

import { useId, type ReactNode } from "react";
import { AB_LABELS, GK_LABELS, GROWTH_LABEL, POS_LABEL } from "@/lib/data";
import type { Player, Pos } from "@/lib/types";

export function Crest({
  colors,
  variant,
  size = 40,
  className,
}: {
  colors: [string, string];
  variant: number;
  size?: number;
  className?: string;
}) {
  const id = useId();
  const [c1, c2] = colors;
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 40 44" className={className} aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d="M20 2 L36 8 V22 C36 33 28 39.5 20 42 C12 39.5 4 33 4 22 V8 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="0" y="0" width="40" height="44" fill={c1} />
        {variant === 0 && (
          <>
            <rect x="9" y="0" width="6" height="44" fill={c2} />
            <rect x="25" y="0" width="6" height="44" fill={c2} />
          </>
        )}
        {variant === 1 && (
          <>
            <rect x="0" y="10" width="40" height="6" fill={c2} />
            <rect x="0" y="26" width="40" height="6" fill={c2} />
          </>
        )}
        {variant === 2 && <polygon points="-6,44 18,0 30,0 6,44" fill={c2} />}
        {variant === 3 && <rect x="20" y="0" width="20" height="44" fill={c2} />}
        {variant === 4 && <circle cx="20" cy="20" r="9" fill={c2} />}
        <circle cx="20" cy="19" r="4.4" fill="rgba(11,14,12,0.28)" />
        <circle cx="20" cy="19" r="4.4" fill="none" stroke="rgba(242,239,228,0.75)" strokeWidth="1" />
      </g>
      <path
        d="M20 2 L36 8 V22 C36 33 28 39.5 20 42 C12 39.5 4 33 4 22 V8 Z"
        fill="none"
        stroke="rgba(242,239,228,0.55)"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "dark" | "gold" | "danger";
  disabled?: boolean;
  className?: string;
  full?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: "bg-turf text-bg0 active:bg-turfdeep",
    gold: "bg-gold text-bg0 active:brightness-90",
    dark: "bg-bg3 text-ink active:bg-line",
    ghost: "bg-transparent text-mut border border-line active:bg-bg2",
    danger: "bg-clay/15 text-clay border border-clay/40 active:bg-clay/25",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`display uppercase tracking-wide text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors disabled:opacity-35 disabled:pointer-events-none ${styles[variant]} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function Ovr({ v, className = "" }: { v: number; className?: string }) {
  const cls = v >= 80 ? "bg-gold text-bg0" : v >= 70 ? "bg-turfdeep text-chalk" : v >= 62 ? "bg-bg3 text-ink" : "bg-bg2 text-mut";
  return (
    <span className={`num display inline-flex items-center justify-center w-8 h-7 rounded-md text-[13px] font-semibold ${cls} ${className}`}>
      {v}
    </span>
  );
}

export function Bar({ v }: { v: number }) {
  const pct = Math.max(4, Math.min(100, ((v - 25) / 70) * 100));
  const color = v >= 80 ? "bg-gold" : v >= 70 ? "bg-turf" : v >= 60 ? "bg-mut" : "bg-dim";
  return (
    <span className="inline-block w-full h-1.5 rounded-full bg-bg3 overflow-hidden align-middle">
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

const POS_STYLE: Record<Pos, string> = {
  GK: "bg-gold/15 text-gold",
  CB: "bg-clay/15 text-clay",
  FB: "bg-[#c97d4a]/15 text-[#d99a6c]",
  CM: "bg-turf/15 text-turf",
  WM: "bg-[#7fb069]/15 text-[#93c17d]",
  WF: "bg-[#5fb3a3]/15 text-[#7fd0c1]",
  ST: "bg-chalk/15 text-chalk",
};

export function PosTag({ pos }: { pos: Pos }) {
  return <span className={`display text-[10px] font-semibold px-1.5 py-0.5 rounded ${POS_STYLE[pos]}`}>{pos}</span>;
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`${n}/5 club strength`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" className={i < n ? "text-gold" : "text-bg3"}>
          <path fill="currentColor" d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="display text-[11px] uppercase tracking-[0.14em] text-dim font-semibold mb-2">{children}</div>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-bg1 border border-line rounded-xl ${className}`}>{children}</div>;
}

/** Full player card overlay. */
export function PlayerCard({
  p,
  ovr,
  onClose,
  footer,
}: {
  p: Player;
  ovr: number;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg0/70" onClick={onClose}>
      <div
        className="w-full max-w-[480px] lg:max-w-[580px] bg-bg1 border border-line rounded-t-2xl p-5 pb-8 fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <Ovr v={ovr} className="w-11 h-10 text-lg" />
          <div className="flex-1">
            <div className="display uppercase font-bold text-lg text-chalk leading-tight">{p.name}</div>
            <div className="text-xs text-mut flex items-center gap-2 mt-0.5">
              <PosTag pos={p.pos} /> {POS_LABEL[p.pos]} · {p.nat} · {p.age}y · Value {p.value}M
            </div>
          </div>
          <button onClick={onClose} className="text-dim text-2xl leading-none px-2 py-1" aria-label="close">
            ✕
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="flex-1 bg-bg2 border border-line rounded-lg px-3 py-2">
            <span className="display block text-[9px] uppercase tracking-widest text-dim">Potential (est.)</span>
            <span className={`num display text-lg font-bold ${p.pot >= 88 ? "text-gold" : p.pot >= 75 ? "text-turf" : "text-ink"}`}>{p.pot}</span>
          </span>
          <span className="flex-1 bg-bg2 border border-line rounded-lg px-3 py-2">
            <span className="display block text-[9px] uppercase tracking-widest text-dim">Growth type</span>
            <span className="display text-[13px] font-semibold text-chalk leading-tight block">{GROWTH_LABEL[p.growth] ?? p.growth}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="display text-[9px] uppercase tracking-widest text-dim mr-1">Optimal:</span>
          <PosTag pos={p.pos} />
          {p.pos2 && <PosTag pos={p.pos2} />}
          {p.pos3 && <PosTag pos={p.pos3} />}
        </div>
        {p.learn && Object.keys(p.learn).length > 0 && (
          <div className="mt-3 space-y-2">
            {Object.entries(p.learn).map(([pos, prog]) => (
              <div key={pos}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-mut">
                    Learning <span className="text-chalk font-semibold">{pos}</span>
                  </span>
                  <span className="num text-dim">{Math.round(prog ?? 0)}%</span>
                </div>
                <Bar v={25 + (prog ?? 0) * 0.7} />
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 mt-4">
          {p.pos === "GK" && p.gk
            ? GK_LABELS.map(([k, label]) => (
                <div key={k}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-mut">{label}</span>
                    <span className="num text-chalk">{p.gk![k]}</span>
                  </div>
                  <Bar v={p.gk![k]} />
                </div>
              ))
            : AB_LABELS.map(([k, label]) => (
                <div key={k}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-mut">{label}</span>
                    <span className="num text-chalk">{p.ab[k]}</span>
                  </div>
                  <Bar v={p.ab[k]} />
                </div>
              ))}
        </div>
        {/* career dossier */}
        {p.career && p.career.length > 0 && (
          <div className="mt-4 bg-bg2 rounded-lg p-3 border border-line">
            <div className="display text-[10px] uppercase tracking-widest text-dim font-semibold mb-2">Career record</div>
            <div className="space-y-1">
              <div className="flex items-center text-[9px] display uppercase tracking-wider text-dim">
                <span className="w-9">Szn</span>
                <span className="w-10">Club</span>
                <span className="flex-1 text-center">Apps</span>
                <span className="flex-1 text-center">G</span>
                <span className="flex-1 text-center">A</span>
                <span className="flex-1 text-center">Avg</span>
              </div>
              {[...p.career].reverse().slice(0, 6).map((c, i) => (
                <div key={i} className="flex items-center text-[11.5px] num">
                  <span className="w-9 text-dim">S{c.season}</span>
                  <span className="w-10 text-mut">{c.clubShort}</span>
                  <span className="flex-1 text-center text-chalk">{c.apps}</span>
                  <span className="flex-1 text-center text-chalk">{c.goals}</span>
                  <span className="flex-1 text-center text-chalk">{c.assists}</span>
                  <span className={`flex-1 text-center font-bold ${c.avg >= 7.2 ? "text-gold" : c.avg >= 6.5 ? "text-turf" : "text-clay"}`}>
                    {c.avg.toFixed(1)}
                  </span>
                </div>
              ))}
              {p.career.length > 6 && <div className="text-[9px] text-dim">+{p.career.length - 6} earlier seasons</div>}
            </div>
          </div>
        )}

        {/* development trajectory */}
        {p.hist.length > 0 && (
          <div className="mt-4 bg-bg2 rounded-lg p-3 border border-line">
            <div className="flex items-center justify-between mb-1.5">
              <span className="display text-[10px] uppercase tracking-widest text-dim font-semibold">Development trajectory</span>
              <span className={`num text-[11px] font-bold ${p.hist.length > 1 && p.hist[p.hist.length - 1] >= p.hist[0] ? "text-turf" : "text-clay"}`}>
                {p.hist.length > 1 ? `${p.hist[p.hist.length - 1] - p.hist[0] >= 0 ? "+" : ""}${p.hist[p.hist.length - 1] - p.hist[0]} ovr` : "rookie year"}
              </span>
            </div>
            <Sparkline values={p.hist} />
            <div className="text-[9px] text-dim mt-1 num">{p.hist.length} season{p.hist.length === 1 ? "" : "s"} tracked · current {p.hist[p.hist.length - 1]}</div>
          </div>
        )}
        {footer && <div className="flex gap-2 mt-5">{footer}</div>}
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 280;
  const h = 44;
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 8) + 4;
    const y = h - 6 - ((v - min) / span) * (h - 12);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#4cb875" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3 : 1.8} fill={i === pts.length - 1 ? "#e4b54e" : "#4cb875"} />
      ))}
    </svg>
  );
}
