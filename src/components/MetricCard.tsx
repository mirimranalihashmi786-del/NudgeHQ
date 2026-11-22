import type { ReactNode } from 'react';

export type MetricTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'primary';

export interface MetricCardProps {
  label: string;
  value: number;
  tone?: MetricTone;
  hint?: ReactNode;
  currency?: string;
}

const valueToneClass: Record<MetricTone, string> = {
  neutral: 'text-foreground',
  positive: 'text-emerald-500',
  negative: 'text-rose-500',
  warning: 'text-amber-500',
  primary: 'text-primary',
};

const accentBarClass: Record<MetricTone, string> = {
  neutral: 'bg-border',
  positive: 'bg-emerald-500',
  negative: 'bg-rose-500',
  warning: 'bg-amber-500',
  primary: 'bg-primary',
};

export default function MetricCard({
  label,
  value,
  tone = 'neutral',
  hint,
  currency = 'USD',
}: MetricCardProps) {
  const safeValue = Number.isFinite(value) ? value : 0;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

  const safeTone: MetricTone = valueToneClass[tone] ? tone : 'neutral';

  return (
    <div data-nexen-component="nx_components_MetricCard" className="relative min-w-0 overflow-hidden rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${accentBarClass[safeTone]}`}
       data-nexen-id="nx-d02d498e-0"/>

      <p className="truncate text-sm font-medium text-muted-foreground" data-nexen-id="nx-d02d498e-1">{label}</p>

      <p
        className={`mt-2 break-words text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${valueToneClass[safeTone]}`}
       data-nexen-id="nx-d02d498e-2">
        {formatter.format(safeValue)}
      </p>

      {hint ? (
        <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}