import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllScreenings } from '../screenings/api';
import { fetchAllHomeVisits } from '../homeVisits/api';
import { fetchAllReferrals } from '../referrals/api';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Card, CardBody, StatCard } from '../../components/ui/Card';
import { Badge, GroupBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Form';
import { RESULT_GROUP_LABEL, REFERRAL_STATUS_LABEL, TARGET_WORK_LABEL } from '../../types';

type Tab = 'overview' | 'screenings' | 'home-visits' | 'referrals';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'screenings', label: 'การคัดกรอง' },
  { key: 'home-visits', label: 'การเยี่ยมบ้าน' },
  { key: 'referrals', label: 'การส่งต่อและผลดำเนินการ' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('overview');

  const { data, loading, error, refetch } = useAsync(async () => {
    const [screenings, homeVisits, referrals] = await Promise.all([
      fetchAllScreenings(),
      fetchAllHomeVisits(),
      fetchAllReferrals(),
    ]);
    return { screenings, homeVisits, referrals };
  }, []);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const { screenings, homeVisits, referrals } = data;

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">รายงาน</h1>
          <p className="text-sm text-gray-500">สรุปข้อมูลการดำเนินงานดูแลช่วยเหลือผู้เรียน</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          พิมพ์รายงาน
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="แบบคัดกรองทั้งหมด" value={screenings.length} />
          <StatCard label="เยี่ยมบ้านทั้งหมด" value={homeVisits.length} />
          <StatCard label="ส่งต่อทั้งหมด" value={referrals.length} />
          <StatCard label="ปิดเคสแล้ว" value={referrals.filter((r) => r.status === 'closed').length} tone="trust" />
        </div>
      )}

      {tab === 'screenings' && (
        <Card>
          <CardBody className="p-0">
            {screenings.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลการคัดกรอง" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">ชื่อผู้เรียน</th>
                      <th className="px-4 py-2.5">กลุ่มเรียน</th>
                      <th className="px-4 py-2.5">ผลรวม</th>
                      <th className="px-4 py-2.5">วันที่คัดกรอง</th>
                      <th className="px-4 py-2.5">ครูที่ปรึกษา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {screenings.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{s.studentName}</td>
                        <td className="px-4 py-2.5 text-gray-500">{s.className}</td>
                        <td className="px-4 py-2.5">
                          <GroupBadge group={s.resultGroup} label={RESULT_GROUP_LABEL[s.resultGroup]} />
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{s.screeningDate}</td>
                        <td className="px-4 py-2.5 text-gray-500">{s.advisorTeacherName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'home-visits' && (
        <Card>
          <CardBody className="p-0">
            {homeVisits.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลการเยี่ยมบ้าน" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">ชื่อผู้เรียน</th>
                      <th className="px-4 py-2.5">กลุ่มเรียน</th>
                      <th className="px-4 py-2.5">วันที่เยี่ยมบ้าน</th>
                      <th className="px-4 py-2.5">ครูที่ปรึกษา</th>
                      <th className="px-4 py-2.5">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {homeVisits.map((v) => (
                      <tr key={v.id}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{v.studentName}</td>
                        <td className="px-4 py-2.5 text-gray-500">{v.className}</td>
                        <td className="px-4 py-2.5 text-gray-500">{v.visitDate}</td>
                        <td className="px-4 py-2.5 text-gray-500">{v.advisorTeacherName}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={v.status === 'submitted' ? 'green' : 'gray'}>
                            {v.status === 'submitted' ? 'ส่งแล้ว' : 'แบบร่าง'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'referrals' && (
        <Card>
          <CardBody className="p-0">
            {referrals.length === 0 ? (
              <EmptyState title="ไม่มีข้อมูลการส่งต่อ" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">ชื่อผู้เรียน</th>
                      <th className="px-4 py-2.5">งานปลายทาง</th>
                      <th className="px-4 py-2.5">สถานะ</th>
                      <th className="px-4 py-2.5">ส่งต่อโดย</th>
                      <th className="px-4 py-2.5">วันที่ส่งต่อ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {referrals.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{r.studentName}</td>
                        <td className="px-4 py-2.5 text-gray-500">{TARGET_WORK_LABEL[r.targetWork]}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={r.status === 'closed' ? 'gray' : r.status === 'completed' ? 'green' : 'blue'}>
                            {REFERRAL_STATUS_LABEL[r.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{r.referredByName}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.referredDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
