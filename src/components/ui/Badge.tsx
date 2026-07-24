import type { ReactNode } from 'react';
import type { ResultGroup } from '../../types';

const GROUP_CLASSES: Record<ResultGroup, string> = {
  trust: 'bg-trust-100 text-trust-700 ring-trust-600/20',
  concern: 'bg-concern-100 text-concern-700 ring-concern-600/20',
  close: 'bg-close-100 text-close-700 ring-close-600/20',
};

export function GroupBadge({ group, label }: { group: ResultGroup; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${GROUP_CLASSES[group]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

type NeutralTone = 'gray' | 'green' | 'yellow' | 'red' | 'blue';

const NEUTRAL_CLASSES: Record<NeutralTone, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  green: 'bg-brand-100 text-brand-700 ring-brand-600/20',
  yellow: 'bg-concern-100 text-concern-700 ring-concern-600/20',
  red: 'bg-close-100 text-close-700 ring-close-600/20',
  blue: 'bg-blue-100 text-blue-700 ring-blue-500/20',
};

export function Badge({ tone = 'gray', children }: { tone?: NeutralTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${NEUTRAL_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
