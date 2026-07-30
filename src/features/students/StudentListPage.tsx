import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useStudentRoster, useRosterFilters } from './useStudentRoster';
import { fetchAllDepartments, fetchAllClasses } from './api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Input } from '../../components/ui/Form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { GroupBadge, Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { RESULT_GROUP_LABEL } from '../../types';

const ALL = '__all__';

export default function StudentListPage() {
  const { profile } = useAuth();
  const overview = canViewCollegeOverview(profile?.role);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // For college-overview roles, a filter must be picked before the heavy
  // roster fetch (every student + screening + home-visit + referral in the
  // college) runs at all.
  const hasFilter = !!(classFilter || deptFilter);
  const shouldLoadRoster = !overview || hasFilter;

  const { data: rows, loading, error, refetch } = useStudentRoster(profile!, shouldLoadRoster);
  const rosterFilters = useRosterFilters(rows);

  // Overview roles need the department dropdown populated before the roster
  // itself has been fetched — pull it from the lightweight legacy collection
  // instead of deriving it from `rows`.
  const { data: allDepartments } = useAsync(async () => (overview ? fetchAllDepartments() : []), [overview]);
  const departmentOptions = overview
    ? Array.from(new Set((allDepartments ?? []).map((d) => d.dep_name))).filter(Boolean) as string[]
    : rosterFilters.departments;

  // Class options always come from the legacy std_class collection (cheap),
  // so "รหัสกลุ่ม - ชื่อย่อ" is available even before the roster loads —
  // scoped down to the teacher's own classes when not viewing the whole college.
  const { data: allClasses } = useAsync(fetchAllClasses, []);
  const classOptions = useMemo(() => {
    const list = allClasses ?? [];
    const relevant = overview ? list : list.filter((c) => (profile?.classIds ?? []).includes(c.class_code));
    return relevant.map((c) => ({ value: c.class_code, label: `${c.class_code} - ${c.short_name || c.class_name}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClasses, overview, JSON.stringify(profile?.classIds)]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (classFilter && classFilter !== ALL && r.classCode !== classFilter) return false;
      if (deptFilter && deptFilter !== ALL && r.departmentName !== deptFilter) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.studentId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, classFilter, deptFilter, search]);

  if (shouldLoadRoster && loading) return <LoadingState />;
  if (shouldLoadRoster && (error || !rows)) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">รายชื่อผู้เรียน</h1>
        <p className="text-sm text-gray-500">
          {rows ? `ทั้งหมด ${rows.length} คน · แสดงผล ${filtered.length} คน` : 'โปรดเลือกสาขาวิชาหรือกลุ่มเรียนเพื่อแสดงข้อมูล'}
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
        <SearchableSelect
          options={departmentOptions.map((d) => ({ value: d, label: d }))}
          value={deptFilter}
          onChange={setDeptFilter}
          placeholder="ทุกสาขาวิชา"
          allLabel="ทุกสาขาวิชา"
          allValue={ALL}
        />
        <SearchableSelect
          options={classOptions}
          value={classFilter}
          onChange={setClassFilter}
          placeholder="ทุกกลุ่มเรียน"
          allLabel="ทุกกลุ่มเรียน"
          allValue={ALL}
        />
      </div>

      {!rows ? (
        <EmptyState title="โปรดเลือกสาขาวิชาหรือกลุ่มเรียน" description="เลือกจากเมนูด้านบนก่อนเริ่มดูรายชื่อผู้เรียน" />
      ) : filtered.length === 0 ? (
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
                        {!overview && (
                          <Link to={`/home-visits/new/${r.studentId}`} className="text-xs font-medium text-brand-700 hover:underline">
                            เยี่ยมบ้าน
                          </Link>
                        )}
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
