"use client";

/**
 * Stats visuals (#11), styled after the reference app: a rating-over-time
 * line with a population median, and a distribution histogram with a
 * "better than X%" marker. Pure SVG, no chart deps.
 */

const W = 560;
const H = 220;
const PAD = 8;

export function EloChart({
  points,
  median,
}: {
  points: { t: number; r: number }[];
  median: number | null;
}) {
  if (points.length < 2) {
    return (
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        Answer more questions and your line draws itself here.
      </p>
    );
  }
  const values = points.map((p) => p.r);
  const lo = Math.min(...values, median ?? Infinity);
  const hi = Math.max(...values, median ?? -Infinity);
  const span = Math.max(hi - lo, 40);
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (r: number) => H - PAD - ((r - lo) / span) * (H - PAD * 2);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.r).toFixed(1)}`).join(" ");

  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Elo over time">
        {[0.15, 0.4, 0.65, 0.9].map((f) => {
          const v = Math.round(lo + span * f);
          return (
            <g key={f}>
              <line x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} stroke="#23262b" strokeWidth="1" />
              <text x={PAD + 2} y={y(v) - 4} fill="#6f7580" fontSize="11" fontFamily="monospace">
                {v}
              </text>
            </g>
          );
        })}
        {median !== null ? (
          <g>
            <line
              x1={PAD}
              x2={W - PAD}
              y1={y(median)}
              y2={y(median)}
              stroke="#d6ff3f"
              strokeWidth="2"
            />
            <text x={W - PAD} y={y(median) - 5} fill="#d6ff3f" fontSize="11" fontFamily="monospace" textAnchor="end">
              median {median}
            </text>
          </g>
        ) : null}
        <polyline points={line} fill="none" stroke="#f2efe9" strokeWidth="1.5" />
      </svg>
    </figure>
  );
}

export function Distribution({
  buckets,
  count,
  median,
  percentile,
  rating,
}: {
  buckets: number[];
  count: number;
  median: number | null;
  percentile: number | null;
  rating: number | null;
}) {
  if (count === 0) {
    return (
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        No rated players yet — play and you set the curve.
      </p>
    );
  }
  const max = Math.max(...buckets, 1);
  const marker = rating !== null ? Math.min(19, Math.max(0, Math.floor((rating - 600) / 80))) : null;

  return (
    <div className="mt-3">
      <div className="flex h-28 items-end gap-[3px]" aria-hidden="true">
        {buckets.map((b, i) => (
          <span
            key={i}
            className={`flex-1 ${marker === i ? "bg-signal" : "bg-paper/70"}`}
            style={{ height: `${Math.max(2, (b / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="label mt-2 flex justify-between text-muted">
        <span>800</span>
        <span>1600</span>
        <span>2400</span>
      </div>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        {percentile !== null && rating !== null ? (
          <>
            This is the rating distribution of {count} players
            {median !== null ? ` (median ${median})` : ""}. You at {rating} are
            better than <span className="text-signal">{percentile}%</span> of them.
          </>
        ) : (
          <>
            Rating distribution of {count} players
            {median !== null ? `, median ${median}` : ""}. Sign in to see where
            you land on it.
          </>
        )}
      </p>
    </div>
  );
}
