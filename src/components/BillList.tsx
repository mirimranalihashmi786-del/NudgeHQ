import { CalendarClock, Receipt } from 'lucide-react';
import type { Bill } from '@/types/bill';

interface BillListProps {
  bills?: Bill[];
  title?: string;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatAmount(value: unknown): string {
  const n = Number(value);
  return currencyFormatter.format(Number.isFinite(n) ? n : 0);
}

function formatDueDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFormatter.format(d);
}

export default function BillList({ bills, title = 'Upcoming bills' }: BillListProps) {
  const safeBills = Array.isArray(bills) ? bills : [];

  return (
    <section data-nexen-component="nx_components_BillList" className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-6 w-full min-w-0" data-nexen-id="nx-7d81e8b9-0">
      <header className="flex items-center justify-between gap-4 mb-4" data-nexen-id="nx-7d81e8b9-1">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground" data-nexen-id="nx-7d81e8b9-2">{title}</h2>
          <p className="text-sm text-muted-foreground" data-nexen-id="nx-7d81e8b9-3">
            Money going out in the coming weeks.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-secondary" data-nexen-id="nx-7d81e8b9-4">
          {safeBills.length} {safeBills.length === 1 ? 'bill' : 'bills'}
        </span>
      </header>

      {safeBills.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Receipt className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground" data-nexen-id="nx-7d81e8b9-5">No upcoming bills</p>
            <p className="text-sm text-muted-foreground" data-nexen-id="nx-7d81e8b9-6">
              Bills you add will appear here with their due dates.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border" data-nexen-id="nx-7d81e8b9-7">
          {safeBills.map((bill) => (
            <li
              key={bill.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
             data-nexen-id="nx-7d81e8b9-8">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" data-nexen-id="nx-7d81e8b9-9">{bill.name}</p>
                  <p className="text-xs text-muted-foreground" data-nexen-id="nx-7d81e8b9-10">
                    Due {formatDueDate(bill.dueDate)}
                  </p>
                </div>
              </div>
              <p className="shrink-0 pl-12 text-sm font-semibold tabular-nums text-foreground sm:pl-0" data-nexen-id="nx-7d81e8b9-11">
                {formatAmount(bill.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}