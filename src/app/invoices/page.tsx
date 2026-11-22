'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import InvoiceTable from '@/components/InvoiceTable';
import NewInvoiceModal from '@/components/NewInvoiceModal';
import NudgeModal from '@/components/NudgeModal';
import { useFinance } from '@/hooks/useFinance';
import { ApiError, createInvoiceMarkPaid } from '@/lib/api';

type InvoiceRow = NonNullable<ReturnType<typeof useFinance>['invoices']>[number];

function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  return (error as { message?: string } | null)?.message ?? 'Something went wrong.';
}

export default function InvoicesPage() {
  const { invoices, isLoading, error, refetch } = useFinance();
  const [showNew, setShowNew] = useState(false);
  const [nudgeTarget, setNudgeTarget] = useState<InvoiceRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleMarkPaid = async (invoiceId: string) => {
    setActionError(null);
    try {
      await createInvoiceMarkPaid(invoiceId, {});
      void refetch();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not mark this invoice as paid.');
    }
  };

  const handleNudge = (invoiceId: string) => {
    const target = (invoices ?? []).find((inv) => inv.id === invoiceId) ?? null;
    setNudgeTarget(target);
  };

  const message = error ? errorText(error) : actionError;

  return (
    <div data-nexen-component="nx_app_invoices_page" className="mx-auto w-full max-w-6xl min-w-0 space-y-6 p-4 sm:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight" data-nexen-id="nx-a5b56746-0">Invoices</h1>
          <p className="text-sm text-muted-foreground" data-nexen-id="nx-a5b56746-1">
            Track paid, sent and overdue invoices, then nudge what is late.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm sm:w-auto"
         data-nexen-id="nx-a5b56746-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New invoice
        </button>
      </div>

      {message && (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {message}
        </div>
      )}

      {isLoading && !invoices ? (
        <p className="text-sm text-muted-foreground" data-nexen-id="nx-a5b56746-3">Loading invoices…</p>
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-[var(--radius)] border bg-card shadow-sm">
          <InvoiceTable
            invoices={invoices}
            onMarkPaid={handleMarkPaid}
            onNudge={handleNudge}
          />
        </div>
      )}

      <NewInvoiceModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => {
          setShowNew(false);
          void refetch();
        }}
      />

      {nudgeTarget && (
        <NudgeModal invoice={nudgeTarget} onClose={() => setNudgeTarget(null)} />
      )}
    </div>
  );
}