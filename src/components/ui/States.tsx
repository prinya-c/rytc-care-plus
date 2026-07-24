import type { ReactNode } from 'react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8" />
        <p className="text-sm text-gray-500">กำลังโหลด...</p>
      </div>
    </div>
  );
}

export function LoadingState({ label = 'กำลังโหลดข้อมูล...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = 'ไม่พบข้อมูล',
  description,
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {icon ?? (
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m-9 3V7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {description && <p className="max-w-xs text-xs text-gray-500">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'เกิดข้อผิดพลาด',
  description = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-close-50 text-close-600">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="max-w-xs text-xs text-gray-500">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
        >
          ลองใหม่อีกครั้ง
        </button>
      )}
    </div>
  );
}
