'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { createInvoice, getClients } from '@/lib/api';
import type { Client } from '@/types/client';

interface NewInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface FormState {
  clientId: string;
  amount: string;
  description: string;
  dueDate: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = { clientId: '', amount: '', description: '', dueDate: '' };
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const amountText = form.amount.trim();
  const amount = Number(amountText);
  const description = form.description.trim();

  if (!form.clientId) errors.clientId = 'Please select a client.';

  if (!amountText) errors.amount = 'Enter an invoice amount.';
  else if (!AMOUNT_PATTERN.test(amountText) || amount <= 0) errors.amount = 'Enter an amount greater than $0.';
  else if (amount > 1000000) errors.amount = 'Amount must be between $0.01 and $1,000,000, with up to 2 decimal places.';

  if (!description) errors.description = 'Enter a short description of the work.';
  else if (description.length < 3 || description.length > 120) {
    errors.description = 'Description must be between 3 and 120 characters.';
  }

  if (!form.dueDate) errors.dueDate = 'Please choose a due date.';
  else if (!DATE_PATTERN.test(form.dueDate) || Number.isNaN(Date.parse(form.dueDate))) {
    errors.dueDate = 'Enter a valid date (YYYY-MM-DD).';
  }

  return errors;
}

export default function NewInvoiceModal({ open, onClose, onCreated }: NewInvoiceModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getClients()
      .then((list) => {
        if (!cancelled) setClients(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setSubmitError('Could not load clients.');
      });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleClose() {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
    onClose();
  }

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSubmitting(true);
    try {
      await createInvoice({
        clientId: form.clientId,
        description: form.description.trim(),
        amount: Number(form.amount),
        dueDate: form.dueDate,
        expectedPaymentDate: form.dueDate,
      });
      setForm(EMPTY_FORM);
      onCreated?.();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full min-w-0 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
  const errorClass = 'mt-1 text-xs text-destructive';

  return (
    <div data-nexen-component="nx_components_NewInvoiceModal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-invoice-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="new-invoice-title" className="text-lg font-semibold text-foreground" data-nexen-id="nx-6c59626e-0">
            New invoice
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-[var(--radius)] p-1 text-muted-foreground hover:text-foreground"
           data-nexen-id="nx-6c59626e-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" data-nexen-id="nx-6c59626e-2">
          <div>
            <label htmlFor="invoice-client" className="mb-1 block text-sm text-muted-foreground" data-nexen-id="nx-6c59626e-3">
              Client
            </label>
            <select
              id="invoice-client"
              value={form.clientId}
              onChange={(e) => update('clientId', e.target.value)}
              className={inputClass}
             data-nexen-id="nx-6c59626e-4">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.clientId && <p className={errorClass} data-nexen-id="nx-6c59626e-5">{errors.clientId}</p>}
          </div>

          <div>
            <label htmlFor="invoice-amount" className="mb-1 block text-sm text-muted-foreground" data-nexen-id="nx-6c59626e-6">
              Amount (USD)
            </label>
            <input
              id="invoice-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
              className={inputClass}
             data-nexen-id="nx-6c59626e-7"/>
            {errors.amount && <p className={errorClass} data-nexen-id="nx-6c59626e-8">{errors.amount}</p>}
          </div>

          <div>
            <label htmlFor="invoice-description" className="mb-1 block text-sm text-muted-foreground" data-nexen-id="nx-6c59626e-9">
              Description
            </label>
            <textarea
              id="invoice-description"
              rows={3}
              placeholder="e.g. Brand identity, phase 2"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className={inputClass}
             data-nexen-id="nx-6c59626e-10"/>
            {errors.description && <p className={errorClass} data-nexen-id="nx-6c59626e-11">{errors.description}</p>}
          </div>

          <div>
            <label htmlFor="invoice-due-date" className="mb-1 block text-sm text-muted-foreground" data-nexen-id="nx-6c59626e-12">
              Due date
            </label>
            <input
              id="invoice-due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => update('dueDate', e.target.value)}
              className={inputClass}
             data-nexen-id="nx-6c59626e-13"/>
            {errors.dueDate && <p className={errorClass} data-nexen-id="nx-6c59626e-14">{errors.dueDate}</p>}
          </div>

          {submitError && (
            <p role="alert" className="rounded-[var(--radius)] bg-destructive/10 px-3 py-2 text-sm text-destructive" data-nexen-id="nx-6c59626e-15">
              {submitError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[var(--radius)] border border-border px-4 py-2 text-sm text-foreground hover:bg-background"
             data-nexen-id="nx-6c59626e-16">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm disabled:opacity-60"
             data-nexen-id="nx-6c59626e-17">
              {isSubmitting ? 'Creating…' : 'Create invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}