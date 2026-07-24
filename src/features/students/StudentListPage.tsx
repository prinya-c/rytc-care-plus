import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStudentRoster, useRosterFilters } from './useStudentRoster';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Input, Select } from '../../components/ui/Form';
import { GroupBadge, Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { RESULT_GROUP_LABEL } from '../../types';

export default function StudentListPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const { data: rows, loading, error, refetch } = useStudentRoster(profile!);
  const filters = useRosterFilters(rows);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (classFilter && r.className !== classFilter) return false;
      if (deptFilter && r.departmentName !== deptFilter) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.studentId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, classFilter, deptFilter, search]);

  if (loading) return <LoadingState />;
  if (error || !rows) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">รายชื่อผู้เรียน</h1>
        <p className="text-sm text-gray-500">
          ทั้งหมด {rows.length} คน · แสดงผล {filtered.length} คน
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="relative col-span-2 sm:col-span-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัส"
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">ทุกสาขาวิชา</option>
          {filters.departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">ทุกกลุ่มเรียน</option>
          {filters.classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="ไม่พบผู้เรียนตามเงื่อนไขที่เลือก" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="hidden grid-cols-12 gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 sm:grid">
            <div className="col-span-4">ชื่อ-สกุล</div>
            <div className="col-span-2">กลุ่มเรียน</div>
            <div className="col-span-2">คัดกรอง</div>
            <div className="col-span-2">เยี่ยมบ้าน</div>
            <div className="col-span-2">ส่งต่อ</div>
          </div>
          <ul className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <li key={r.studentId} className="px-4 py-3 hover:bg-gray-50">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center sm:gap-2">
                  <div className="sm:col-span-4">
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400">
                      {r.studentId} · {r.departmentName}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 sm:col-span-2">{r.className}</div>
                  <div className="sm:col-span-2">
                    {r.screened && r.resultGroup ? (
                      <GroupBadge group={r.resultGroup} label={RESULT_GROUP_LABEL[r.resultGroup]} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge tone="gray">ยังไม่คัดกรอง</Badge>
                        <Link to="/screenings" className="text-xs font-medium text-brand-700 hover:underline">
                          ไปคัดกรอง
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    {r.visited ? (
                      <Badge tone="green">เยี่ยมแล้ว</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge tone="gray">ยังไม่เยี่ยม</Badge>
                        <Link to={`/home-visits/new/${r.studentId}`} className="text-xs font-medium text-brand-700 hover:underline">
                          เยี่ยมบ้าน
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:col-span-2">
                    {r.referred ? <Badge tone="blue">ส่งต่อแล้ว</Badge> : <Badge tone="gray">ยังไม่ส่งต่อ</Badge>}
                    <Link
                      to={`/referrals/new/${r.studentId}`}
                      className="text-xs font-medium text-brand-700 hover:underline sm:hidden"
                    >
                      ส่งต่อ
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
