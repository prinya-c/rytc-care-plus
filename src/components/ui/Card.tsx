import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 sm:text-base">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  tone = 'default',
  icon,
  to,
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'trust' | 'concern' | 'close';
  icon?: ReactNode;
  /** If set, the whole card becomes a link to this route. */
  to?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-brand-700 bg-brand-50',
    trust: 'text-trust-700 bg-trust-50',
    concern: 'text-concern-700 bg-concern-50',
    close: 'text-close-700 bg-close-50',
  };
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 sm:text-sm">{label}</p>
        {icon && <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{value}</p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        <Card className="p-4 transition-shadow hover:shadow-md sm:p-5">{content}</Card>
      </Link>
    );
  }

  return <Card className="p-4 sm:p-5">{content}</Card>;
}
