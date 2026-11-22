'use client';

import { useMemo } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

export interface OverdueInvoiceRow {
  id: string;
  clientName: string;
  amount: number | string;
  daysOverdue: number;
}

export interface ActionCenterProps {
  overdueInvoices?: OverdueInvoiceRow[] | null;
  onDraftNudge?: (invoiceId: string) => void;
}

function formatAmount(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDays(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'} overdue`;
}

export default function ActionCenter({ overdueInvoices, onDraftNudge }: ActionCenterProps) {
  const rows = useMemo(() => {
    const safe = Array.isArray(overdueInvoices) ? overdueInvoices : [];
    return safe
      .filter((r) => r && Number.isFinite(Number(r.amount)))
      .map((r) => ({ ...r, daysOverdue: Math.max(0, Number(r.daysOverdue) || 0) }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [overdueInvoices]);

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const count = rows.length;

  return (
    <section data-nexen-component="nx_components_ActionCenter"
      role="alert"
      aria-label="Action Center: overdue invoices"
      className="w-full min-w-0 rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-4 shadow-sm sm:p-6"
     data-nexen-id="nx-f76e33ae-0">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground" data-nexen-id="nx-f76e33ae-1">
            {count} {count === 1 ? 'invoice is' : 'invoices are'} overdue · {formatAmount(total)} outstanding
          </h3>

          <ul className="mt-3 flex flex-col gap-2" data-nexen-id="nx-f76e33ae-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex w-full min-w-0 flex-col gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
               data-nexen-id="nx-f76e33ae-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" data-nexen-id="nx-f76e33ae-4">{row.clientName}</p>
                  <p className="text-xs text-muted-foreground" data-nexen-id="nx-f76e33ae-5">
                    <span className="font-semibold text-destructive" data-nexen-id="nx-f76e33ae-6">{formatDays(row.daysOverdue)}</span>
                    <span className="mx-1.5" data-nexen-id="nx-f76e33ae-7">·</span>
                    <span className="tabular-nums" data-nexen-id="nx-f76e33ae-8">{formatAmount(row.amount)}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDraftNudge?.(row.id)}
                  className="inline-flex w-full flex-none items-center justify-center gap-1.5 rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
                 data-nexen-id="nx-f76e33ae-9">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Draft AI Nudge
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}