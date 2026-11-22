import type { Client } from '@/types/client';
import type { Invoice } from '@/types/invoice';
import type { Bill } from '@/types/bill';

export type OnboardingStepId = 'add-client' | 'create-invoice' | 'add-bill';

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  order: number;
}

export interface OnboardingData {
  clients?: Client[] | null;
  invoices?: Invoice[] | null;
  bills?: Bill[] | null;
}

export interface OnboardingStepStatus extends OnboardingStep {
  completed: boolean;
}

export interface OnboardingProgress {
  steps: OnboardingStepStatus[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  isComplete: boolean;
  nextStep: OnboardingStepStatus | null;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'add-client',
    order: 1,
    title: 'Add your first client',
    description: 'Save a client with their email and WhatsApp number so reminders can reach them.',
    href: '/clients',
    ctaLabel: 'Add client',
  },
  {
    id: 'create-invoice',
    order: 2,
    title: 'Create your first invoice',
    description: 'Bill a client for finished work and set the date you expect to be paid.',
    href: '/invoices',
    ctaLabel: 'Create invoice',
  },
  {
    id: 'add-bill',
    order: 3,
    title: 'Add an upcoming bill',
    description: 'Track what you owe so the cash flow forecast shows outgoing money too.',
    href: '/',
    ctaLabel: 'Add bill',
  },
] as const;

function normaliseList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Determines which onboarding steps are complete from the data the user already has.
 * Pure function: no side effects, no reads of the clock, safe to call during render.
 */
export function getOnboardingProgress(data: OnboardingData | null | undefined): OnboardingProgress {
  const clients = normaliseList(data?.clients);
  const invoices = normaliseList(data?.invoices);
  const bills = normaliseList(data?.bills);

  const completedById: Record<OnboardingStepId, boolean> = {
    'add-client': clients.length > 0,
    'create-invoice': invoices.length > 0,
    'add-bill': bills.length > 0,
  };

  const steps: OnboardingStepStatus[] = ONBOARDING_STEPS.map((step) => ({
    ...step,
    completed: completedById[step.id],
  }));

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const percentComplete = totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100);

  return {
    steps,
    completedCount,
    totalCount,
    percentComplete,
    isComplete: completedCount === totalCount,
    nextStep: steps.find((s) => !s.completed) ?? null,
  };
}

export function isOnboardingComplete(data: OnboardingData | null | undefined): boolean {
  return getOnboardingProgress(data).isComplete;
}