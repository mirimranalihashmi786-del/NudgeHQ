'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, MessageCircle, X } from 'lucide-react';
import { createInvoiceNudgeDraft } from '@/lib/api';

const MAX_LENGTH = 4096;
const DIGITS_ONLY = /^\d+$/;

export interface NudgeInvoice {
  id: string;
  invoiceNumber: number | null;
  clientName: string;
  clientWhatsapp: string | null;
  amount: number;
  daysOverdue: number;
}

interface NudgeModalProps {
  invoice: NudgeInvoice;
  onClose: () => void;
}

function templateFor(invoice: NudgeInvoice): string {
  const ref = invoice.invoiceNumber ?? invoice.id;
  return `Hi ${invoice.clientName}, just a quick nudge that invoice #${ref} for $${invoice.amount} is ${invoice.daysOverdue} days overdue. Let me know if you need me to resend the payment link. Thanks, Maya.`;
}

export default function NudgeModal({ invoice, onClose }: NudgeModalProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Draft a fresh nudge each time the modal opens for an invoice.
  // Edits live only in this modal and are discarded on close.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    createInvoiceNudgeDraft(invoice.id, {})
      .then((draft) => {
        if (!cancelled) setMessage(draft.message || templateFor(invoice));
      })
      .catch(() => {
        // Silent fallback: the plain template keeps the nudge usable.
        if (!cancelled) setMessage(templateFor(invoice));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const validateMessage = (): string | null => {
    if (!message.trim()) return "Message can't be empty. Add some text before sending.";
    if (message.length > MAX_LENGTH) {
      return 'This message is too long for WhatsApp. Please shorten it to 4096 characters or fewer.';
    }
    return null;
  };

  const handleSend = () => {
    const messageError = validateMessage();
    if (messageError) {
      setError(messageError);
      return;
    }
    const digits = invoice.clientWhatsapp ?? '';
    if (!digits) {
      setError('This client has no WhatsApp number. Add one to send via WhatsApp, or use Copy instead.');
      return;
    }
    if (!DIGITS_ONLY.test(digits)) {
      setError('WhatsApp number must be digits only with country code, for example 15551234567.');
      return;
    }
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleCopy = async () => {
    const messageError = validateMessage();
    if (messageError) {
      setError(messageError);
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the text and copy it manually.');
    }
  };

  const hasWhatsapp = Boolean(invoice.clientWhatsapp);
  const ref = invoice.invoiceNumber ? `INV-${invoice.invoiceNumber}` : invoice.id;

  return (
    <div data-nexen-component="nx_components_NudgeModal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nudge-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg min-w-0 rounded-[var(--radius)] border bg-card p-6 text-card-foreground shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="nudge-modal-title" className="text-lg font-semibold" data-nexen-id="nx-61bfd82d-0">
              Draft AI nudge
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground" data-nexen-id="nx-61bfd82d-1">
              {ref} · {invoice.clientName} · {invoice.daysOverdue} days overdue
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-[var(--radius)] p-1 text-muted-foreground hover:text-foreground"
           data-nexen-id="nx-61bfd82d-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Drafting your reminder…
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
              }}
              aria-label="Nudge message"
              className="min-h-[160px] w-full min-w-0 rounded-[var(--radius)] border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
             data-nexen-id="nx-61bfd82d-3"/>
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {message.length}/{MAX_LENGTH}
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive" data-nexen-id="nx-61bfd82d-4">
            {error}
          </p>
        )}

        {!hasWhatsapp && !loading && (
          <p className="mt-3 text-xs text-muted-foreground" data-nexen-id="nx-61bfd82d-5">
            No WhatsApp number on file for this client.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCopy}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50"
           data-nexen-id="nx-61bfd82d-6">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !hasWhatsapp}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
           data-nexen-id="nx-61bfd82d-7">
            <MessageCircle className="h-4 w-4" />
            Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}