'use client';

import BillList from '@/components/BillList';
import { useFinance } from '@/hooks/useFinance';

export default function BillsPage() {
  const { bills, isLoading, error, refetch } = useFinance();

  const safeBills = Array.isArray(bills) ? bills : [];

  const openBills = safeBills
    .filter((bill) => bill.status !== 'paid' && bill.status !== 'cancelled')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const paidCount = safeBills.filter((bill) => bill.status === 'paid').length;

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground" data-nexen-id="nx-34067a5e-0">Loading bills…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
        <div className="rounded-[var(--radius)] border bg-card p-4 shadow-sm">
          <p className="text-sm text-destructive" data-nexen-id="nx-34067a5e-1">Could not load bills: {String(error)}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-[var(--radius)] border px-3 py-1.5 text-sm font-medium"
           data-nexen-id="nx-34067a5e-2">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-nexen-component="nx_app_bills_page" className="mx-auto w-full max-w-3xl min-w-0 space-y-6 p-4 sm:p-6">
      <header className="min-w-0" data-nexen-id="nx-34067a5e-3">
        <h1 className="text-2xl font-bold tracking-tight" data-nexen-id="nx-34067a5e-4">Bills</h1>
      </header>

      <BillList bills={openBills} title="Upcoming bills" />

      {paidCount > 0 && (
        <p className="text-sm text-muted-foreground" data-nexen-id="nx-34067a5e-5">
          {paidCount} paid {paidCount === 1 ? 'bill is' : 'bills are'} excluded from Total Bills Due and the forecast.
        </p>
      )}
    </div>
  );
}