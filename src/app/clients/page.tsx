
'use client';

import ClientList from '@/components/ClientList';
import { useFinance } from '@/hooks/useFinance';

export default function ClientsPage() {
  const { clients, isLoading, error, refetch } = useFinance();
  const errorMessage = error instanceof Error ? error.message : String(error);

  return (
    <div data-nexen-component="nx_app_clients_page" className="mx-auto w-full max-w-5xl min-w-0 space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between" data-nexen-id="nx-47b8a16e-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground" data-nexen-id="nx-47b8a16e-1">Clients</h1>
          <p className="text-sm text-muted-foreground" data-nexen-id="nx-47b8a16e-2">
            Contact details and what each client still owes you.
          </p>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[var(--radius)] border border-destructive/35 bg-destructive/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0 break-words" data-nexen-id="nx-47b8a16e-3">Could not load clients: {errorMessage}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm text-foreground"
           data-nexen-id="nx-47b8a16e-4">
            Try again
          </button>
        </div>
      ) : null}

      {isLoading && !clients ? (
        <p className="text-sm text-muted-foreground" data-nexen-id="nx-47b8a16e-5">Loading clients…</p>
      ) : (
        <ClientList clients={clients} />
      )}
    </div>
  );
}