// Lightweight SVG/CSS charts for the local admin dashboard.
// No chart dependency: keeps the desktop bundle small and offline.

import type { ReactNode } from "react";

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

export function LineChart({
  labels,
  series,
  height = 190,
  valueFormatter = (value: number) => String(Math.round(value)),
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
  valueFormatter?: (value: number) => string;
}) {
  const width = 640;
  const padX = 10;
  const padTop = 12;
  const padBottom = 26;
  const plotHeight = height - padTop - padBottom;
  const maxValue = Math.max(
    1,
    ...series.flatMap((item) => item.values.map((value) => Number(value) || 0))
  );
  const pointCount = Math.max(2, labels.length);

  const pointsFor = (values: number[]) =>
    values.map((value, index) => {
      const x = padX + (index / Math.max(1, pointCount - 1)) * (width - padX * 2);
      const y = padTop + plotHeight - (Math.max(0, value) / maxValue) * plotHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

  const labelIndexes = [...new Set([0, Math.floor((pointCount - 1) / 2), pointCount - 1])];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Trend chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padTop + plotHeight * ratio;
          return (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}
        {series.map((item) => (
          <polyline
            key={item.label}
            points={pointsFor(item.values).join(" ")}
            fill="none"
            stroke={item.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {labelIndexes.map((index) => {
          const x = padX + (index / Math.max(1, pointCount - 1)) * (width - padX * 2);
          return (
            <text
              key={`${index}-${labels[index]}`}
              x={x}
              y={height - 7}
              textAnchor={index === 0 ? "start" : index === pointCount - 1 ? "end" : "middle"}
              fontSize="10"
              fill="#94a3b8"
            >
              {labels[index] ?? ""}
            </text>
          );
        })}
        <text x={padX} y={padTop - 2} fontSize="10" fill="#94a3b8">
          {valueFormatter(maxValue)}
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface BarItem {
  label: string;
  value: number;
}

export function BarList({
  items,
  valueFormatter = (value: number) => String(Math.round(value)),
  emptyMessage = "No data in this range.",
  tone = "bg-teal-600",
}: {
  items: BarItem[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  tone?: string;
}) {
  const max = Math.max(1, ...items.map((item) => Math.max(0, item.value)));
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-slate-600">{item.label}</span>
            <span className="num shrink-0 font-medium text-slate-700">
              {valueFormatter(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${tone}`}
              style={{ width: `${Math.max(2, (Math.max(0, item.value) / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "text-teal-700 bg-teal-50",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="num truncate text-lg font-semibold leading-tight">{value}</p>
          <p className="truncate text-xs text-slate-500">{label}</p>
          {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
