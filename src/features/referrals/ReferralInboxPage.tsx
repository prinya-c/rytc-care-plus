import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchReferralsByTargetWork, fetchAllReferrals, receiveReferral } from './api';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Select, Button } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { targetWorkForRole } from '../../utils/rbac';
import {
  REFERRAL_STATUS_LABEL,
  TARGET_WORK_LABEL,
  PROBLEM_LABEL,
  PROBLEM_ORDER,
  type ReferralStatus,
  type TargetWork,
} from '../../types';

const STATUS_TONE: Record<ReferralStatus, 'gray' | 'green' | 'yellow' | 'red' | 'blue'> = {
  sent: 'yellow',
  received: 'blue',
  in_progress: 'blue',
  completed: 'green',
  closed: 'gray',
};

export default function ReferralInboxPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const roleTargetWork = targetWorkForRole(profile?.role);
  const [targetWork, setTargetWork] = useState<TargetWork | ''>(roleTargetWork ?? '');
  const [statusFilter, setStatusFilter] = useState<ReferralStatus | ''>('');
  const [receivingId, setReceivingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAsync(
    () => (targetWork ? fetchReferralsByTargetWork(targetWork) : fetchAllReferrals()),
    [targetWork],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    return statusFilter ? data.filter((r) => r.status === statusFilter) : data;
  }, [data, statusFilter]);

  async function handleReceive(id: string) {
    if (!profile) return;
    setReceivingId(id);
    try {
      await receiveReferral(id, profile.teacherId ?? profile.uid);
      showToast('รับเรื่องเรียบร้อยแล้ว');
      refetch();
    } catch {
      showToast('ดำเนินการไม่สำเร็จ', 'error');
    } finally {
      setReceivingId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">กล่องรับเรื่องส่งต่อ</h1>
        <p className="text-sm text-gray-500">ทั้งหมด {filtered.length} รายการ</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:w-96">
        {!roleTargetWork && (
          <Select value={targetWork} onChange={(e) => setTargetWork(e.target.value as TargetWork)}>
            <option value="">ทุกงานปลายทาง</option>
            {(Object.keys(TARGET_WORK_LABEL) as TargetWork[]).map((tw) => (
              <option key={tw} value={tw}>
                {TARGET_WORK_LABEL[tw]}
              </option>
            ))}
          </Select>
        )}
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReferralStatus)}>
          <option value="">ทุกสถานะ</option>
          {(Object.keys(REFERRAL_STATUS_LABEL) as ReferralStatus[]).map((s) => (
            <option key={s} value={s}>
              {REFERRAL_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="ไม่มีรายการส่งต่อ" />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{r.studentName}</p>
                    <Badge tone={STATUS_TONE[r.status]}>{REFERRAL_STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {r.className} · ส่งต่อโดย {r.referredByName} · {r.referredDate}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {r.problems && PROBLEM_ORDER.filter((key) => r.problems[key]).map((key) => PROBLEM_LABEL[key]).join(', ')}
                    {r.problemSummary ? ` — ${r.problemSummary}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status === 'sent' && (
                    <Button variant="primary" loading={receivingId === r.id} onClick={() => handleReceive(r.id)}>
                      รับเรื่อง
                    </Button>
                  )}
                  <Link to={`/referrals/${r.id}`}>
                    <Button variant="secondary">ดูรายละเอียด</Button>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
