import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchDisabilitySurveysByTeacher, fetchAllDisabilitySurveys, deleteDisabilitySurvey } from './api';
import { fetchAllDepartments, fetchAllClasses } from '../students/api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { DISABILITY_TYPE_LABEL, DISABILITY_TYPE_ORDER } from '../../types';
import type { DisabilitySurvey } from '../../types';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Input, Button } from '../../components/ui/Form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';

const ALL = '__all__';

export default function DisabilitySurveyListPage() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // For college-overview roles, a filter must be picked before the heavy
  // fetch (every survey record in the college) runs at all.
  const hasFilter = !!(classFilter || deptFilter);
  const shouldLoad = !overview || hasFilter;

  const { data: allRecords, loading, error, refetch } = useAsync(async () => {
    if (!shouldLoad) return null;
    return overview ? fetchAllDisabilitySurveys() : fetchDisabilitySurveysByTeacher(profile?.teacherId ?? profile?.uid ?? '');
  }, [shouldLoad, overview, profile?.uid]);

  // Overview roles need the filter dropdowns populated before the records
  // themselves have been fetched — pull them from the lightweight legacy
  // collections instead of deriving them from the (possibly not-yet-loaded) data.
  const { data: allDepartments } = useAsync(async () => (overview ? fetchAllDepartments() : []), [overview]);
  const departmentOptions = Array.from(new Set((allDepartments ?? []).map((d) => d.dep_name))).filter(Boolean) as string[];

  const { data: allClasses } = useAsync(fetchAllClasses, []);
  const classOptions = useMemo(() => {
    const list = allClasses ?? [];
    const relevant = overview ? list : list.filter((c) => (profile?.classIds ?? []).includes(c.class_code));
    return relevant.map((c) => ({ value: c.class_code, label: `${c.class_code} - ${c.short_name || c.class_name}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClasses, overview, JSON.stringify(profile?.classIds)]);

  const data = useMemo(() => {
    if (!allRecords) return null;
    return allRecords.filter((record) => {
      if (classFilter && classFilter !== ALL && record.classId !== classFilter) return false;
      if (deptFilter && deptFilter !== ALL && record.departmentName !== deptFilter) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (!record.studentName.toLowerCase().includes(q) && !record.studentId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, classFilter, deptFilter, search]);

  async function handleDelete(record: DisabilitySurvey) {
    const ok = await confirm({
      title: 'ลบแบบสำรวจข้อมูลผู้เรียนพิการนี้?',
      description: `${record.studentName} — ลบแล้วไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(record.id);
    try {
      await deleteDisabilitySurvey(record.id);
      showToast('ลบบันทึกเรียบร้อยแล้ว');
      refetch();
    } catch {
      showToast('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  if (shouldLoad && loading) return <LoadingState />;
  if (shouldLoad && (error || !data)) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">สำรวจข้อมูลผู้เรียนพิการ</h1>
          <p className="text-sm text-gray-500">{data ? `ทั้งหมด ${data.length} รายการ` : 'โปรดเลือกสาขาวิชาหรือกลุ่มเรียนเพื่อแสดงข้อมูล'}</p>
        </div>
        {!overview && (
          <Link to="/disabilities/new">
            <Button variant="primary">+ เพิ่มข้อมูล</Button>
          </Link>
        )}
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="relative col-span-2 sm:col-span-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส" className="pl-9" />
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
      )}

      {!data ? (
        <EmptyState title="โปรดเลือกสาขาวิชาหรือกลุ่มเรียน" description="เลือกจากเมนูด้านบนก่อนเริ่มดูแบบสำรวจข้อมูลผู้เรียนพิการ" />
      ) : data.length === 0 ? (
        <EmptyState title="ยังไม่มีข้อมูลผู้เรียนพิการ" description="เริ่มบันทึกแบบสำรวจข้อมูลผู้เรียนพิการฉบับแรกของคุณ" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((record) => {
            const types = DISABILITY_TYPE_ORDER.filter((k) => record.disabilityTypes?.[k]);
            return (
              <div key={record.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon name="id-card" className="h-4 w-4" />
                  </div>
                  {!overview && (
                    <div className="flex gap-1.5">
                      <Link
                        to={`/disabilities/${record.id}/edit`}
                        title="แก้ไข"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <Icon name="pencil" className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        title="ลบ"
                        disabled={deletingId === record.id}
                        onClick={() => handleDelete(record)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="mt-3 text-sm font-bold leading-snug text-gray-900">{record.studentName}</p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="blue">{record.className}</Badge>
                  {types.length === 0 ? (
                    <Badge tone="gray">ยังไม่ระบุประเภทความพิการ</Badge>
                  ) : (
                    types.map((k) => (
                      <Badge key={k} tone="yellow">
                        {DISABILITY_TYPE_LABEL[k]}
                      </Badge>
                    ))
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <Icon name="calendar" className="h-3.5 w-3.5" />
                  ภาคเรียนที่ {record.semester || '-'} ปีการศึกษา {record.academicYear || '-'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
