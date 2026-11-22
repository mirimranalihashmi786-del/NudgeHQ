
'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import type { Invoice } from '@/types/invoice';

export type InvoiceStatus = 'paid' | 'sent' | 'overdue';

export type InvoiceRow = Invoice & {
  clientName: string;
  status: InvoiceStatus;
};

interface InvoiceTableProps {
  invoices?: InvoiceRow[] | null;
  onMarkPaid?: (invoiceId: string) => void;
  onNudge?: (invoiceId: string) => void;
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  paid: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  sent: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
  overdue: 'border-rose-500/30 bg-rose-500/15 text-rose-400',
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: 'Paid',
  sent: 'Sent',
  overdue: 'Overdue',
};

const DAY_MS = 86_400_000;

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function formatDue(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Whole days between the due date (UTC calendar day) and today; 0 if not past due.
function daysPastDue(dueValue: string | Date, nowMs: number): number {
  const due = new Date(dueValue);
  const now = new Date(nowMs);
  const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((todayUtc - dueUtc) / DAY_MS));
}

export default function InvoiceTable({ invoices, onMarkPaid, onNudge }: InvoiceTableProps) {
  const rows = Array.isArray(invoices) ? invoices : [];

  // Read the clock only after mount so server and client markup match.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center text-sm text-slate-400">
        No invoices yet. Create your first invoice to start tracking payments.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-800">
      <table className="w-full min-w-[640px] border-collapse text-sm" data-nexen-id="nx-6f93262a-0">
        <thead data-nexen-id="nx-6f93262a-1">
          <tr className="border-b border-slate-700 text-left text-xs font-medium text-slate-400" data-nexen-id="nx-6f93262a-2">
            <th className="px-4 py-3" data-nexen-id="nx-6f93262a-3">Invoice</th>
            <th className="px-4 py-3" data-nexen-id="nx-6f93262a-4">Client</th>
            <th className="px-4 py-3" data-nexen-id="nx-6f93262a-5">Description</th>
            <th className="px-4 py-3 text-right" data-nexen-id="nx-6f93262a-6">Amount</th>
            <th className="px-4 py-3" data-nexen-id="nx-6f93262a-7">Due</th>
            <th className="px-4 py-3" data-nexen-id="nx-6f93262a-8">Status</th>
            <th className="px-4 py-3 text-right" data-nexen-id="nx-6f93262a-9">Actions</th>
          </tr>
        </thead>
        <tbody data-nexen-id="nx-6f93262a-10">
          {rows.map((invoice) => {
            const amount = Number(invoice.amount);
            const isPaid = invoice.status === 'paid';
            const isOverdue = invoice.status === 'overdue';
            const overdueDays =
              isOverdue && nowMs !== null ? daysPastDue(invoice.dueDate, nowMs) : null;

            return (
              <tr data-nexen-component="nx_components_InvoiceTable"
                key={invoice.id}
                className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/30"
               data-nexen-id="nx-6f93262a-11">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300" data-nexen-id="nx-6f93262a-12">
                  INV-{invoice.invoiceNumber ?? invoice.id.slice(0, 8)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-100" data-nexen-id="nx-6f93262a-13">{invoice.clientName}</td>
                <td className="max-w-[220px] px-4 py-3 text-slate-400" data-nexen-id="nx-6f93262a-14">
                  <span className="line-clamp-2" data-nexen-id="nx-6f93262a-15">{invoice.description}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-100" data-nexen-id="nx-6f93262a-16">
                  {currency.format(Number.isFinite(amount) ? amount : 0)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400" data-nexen-id="nx-6f93262a-17">
                  {formatDue(invoice.dueDate)}
                </td>
                <td className="px-4 py-3" data-nexen-id="nx-6f93262a-18">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[invoice.status]}`}
                     data-nexen-id="nx-6f93262a-19">
                      {STATUS_LABELS[invoice.status]}
                    </span>
                    {overdueDays !== null && (
                      <span className="whitespace-nowrap text-xs text-rose-400" data-nexen-id="nx-6f93262a-20">
                        {overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3" data-nexen-id="nx-6f93262a-21">
                  <div className="flex flex-wrap justify-end gap-2">
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => onMarkPaid?.(invoice.id)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400"
                       data-nexen-id="nx-6f93262a-22">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Mark as paid
                      </button>
                    )}
                    {isOverdue && (
                      <button
                        type="button"
                        onClick={() => onNudge?.(invoice.id)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                       data-nexen-id="nx-6f93262a-23">
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        Nudge
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}