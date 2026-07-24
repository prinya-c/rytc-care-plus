import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { fetchOfficerInboxSummary } from './api';
import { StatCard } from '../../components/ui/Card';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Icon } from '../../components/ui/Icon';
import { targetWorkForRole, ROLE_LABEL } from '../../utils/rbac';
import type { UserProfile } from '../../types';

export default function OfficerDashboard({ profile }: { profile: UserProfile }) {
  const targetWork = targetWorkForRole(profile.role);
  const { data, loading, error, refetch } = useAsync(
    () => (targetWork ? fetchOfficerInboxSummary(targetWork) : Promise.resolve(null)),
    [targetWork],
  );

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{ROLE_LABEL[profile.role]}</h1>
        <p className="text-sm text-gray-500">รายการส่งต่อที่เกี่ยวข้องกับงานของคุณ</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="รอรับเรื่อง" value={data.sent} tone="concern" icon={<Icon name="inbox" />} />
        <StatCard label="รับเรื่องแล้ว" value={data.received} icon={<Icon name="inbox" />} />
        <StatCard label="กำลังดำเนินการ" value={data.in_progress} icon={<Icon name="clipboard" />} />
        <StatCard label="ดำเนินการแล้ว" value={data.completed} tone="trust" icon={<Icon name="clipboard" />} />
      </div>

      <StatCard label="ปิดเคสแล้ว" value={data.closed} />

      <Link
        to="/referral-inbox"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        <Icon name="inbox" className="h-4 w-4" />
        ไปที่กล่องรับเรื่อง
      </Link>
    </div>
  );
}
