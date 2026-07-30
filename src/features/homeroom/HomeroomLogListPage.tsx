import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeroomLogsByTeacher, fetchAllHomeroomLogs, deleteHomeroomLog } from './api';
import { fetchAllDepartments, fetchAllClasses } from '../students/api';
import { deleteImageByUrl } from '../../lib/storage';
import { formatThaiDate } from '../../utils/thaiDate';
import { waitForImages } from '../../utils/waitForImages';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { canViewCollegeOverview } from '../../utils/rbac';
import type { HomeroomLog } from '../../types';

const ALL = '__all__';

export default function HomeroomLogListPage() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  // Which log is currently being printed, and whether the print dialog has
  // been triggered — printing happens in place, without navigating away.
  const [printLog, setPrintLog] = useState<HomeroomLog | null>(null);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // For college-overview roles, a filter must be picked before the heavy
  // fetch (every homeroom log in the college) runs at all.
  const hasFilter = !!(classFilter || deptFilter);
  const shouldLoad = !overview || hasFilter;

  const { data: allLogs, loading, error, refetch } = useAsync(async () => {
    if (!shouldLoad) return null;
    return overview ? fetchAllHomeroomLogs() : fetchHomeroomLogsByTeacher(profile?.teacherId ?? profile?.uid ?? '');
  }, [shouldLoad, overview, profile?.uid]);

  // Overview roles need the filter dropdowns populated before the logs
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
    if (!allLogs) return null;
    return allLogs.filter((log) => {
      if (classFilter && classFilter !== ALL && log.classId !== classFilter) return false;
      if (deptFilter && deptFilter !== ALL && log.departmentName !== deptFilter) return false;
      return true;
    });
  }, [allLogs, classFilter, deptFilter]);

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      await waitForImages(printRef.current);
      if (!cancelled) window.print();
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [printing]);

  useEffect(() => {
    function handleAfterPrint() {
      setPrinting(false);
    }
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  async function handleDelete(log: HomeroomLog) {
    const ok = await confirm({
      title: 'ลบบันทึกกิจกรรมโฮมรูมนี้?',
      description: `ครั้งที่ ${log.sessionNumber} — ${log.className} — ลบแล้วไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(log.id);
    try {
      await deleteHomeroomLog(log.id);
      await Promise.all(log.images.map((url) => deleteImageByUrl(url)));
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
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">บันทึกกิจกรรมโฮมรูม</h1>
          <p className="text-sm text-gray-500">{data ? `ทั้งหมด ${data.length} รายการ` : 'โปรดเลือกสาขาวิชาหรือกลุ่มเรียนเพื่อแสดงข้อมูล'}</p>
        </div>
        {!overview && (
          <Link to="/homeroom/new">
            <Button variant="primary">+ บันทึกใหม่</Button>
          </Link>
        )}
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-2 print:hidden">
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
        <EmptyState title="โปรดเลือกสาขาวิชาหรือกลุ่มเรียน" description="เลือกจากเมนูด้านบนก่อนเริ่มดูบันทึกกิจกรรมโฮมรูม" />
      ) : data.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบันทึกกิจกรรมโฮมรูม"
          description="เริ่มบันทึกการพบนักเรียนในคาบโฮมรูมครั้งแรกของคุณ"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
          {data.map((log) => {
            const presentCount = log.totalStudents - log.absentStudents.length;
            return (
              <div key={log.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon name="calendar" className="h-4 w-4" />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      title="พิมพ์บันทึกข้อความ"
                      onClick={() => {
                        setPrintLog(log);
                        setPrinting(true);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                    >
                      <Icon name="printer" className="h-4 w-4" />
                    </button>
                    {!overview && (
                      <>
                        <Link
                          to={`/homeroom/${log.id}/edit`}
                          title="แก้ไข"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          <Icon name="pencil" className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          title="ลบ"
                          disabled={deletingId === log.id}
                          onClick={() => handleDelete(log)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-sm font-bold leading-snug text-gray-900">{log.className}</p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="blue">ครั้งที่ {log.sessionNumber}</Badge>
                  <Badge tone="green">{log.classId}</Badge>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  ภาคเรียนที่ {log.semester} ปีการศึกษา {log.academicYear}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Icon name="calendar" className="h-3.5 w-3.5" />
                    {log.sessionDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="users" className="h-3.5 w-3.5" />
                    {presentCount}/{log.totalStudents}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print-only: official บันทึกข้อความ (memo) mirroring the college's paper form. */}
      {printing && printLog && (
        <div ref={printRef} className="hidden print:block text-sm leading-relaxed">
          <div className="relative flex items-center justify-center">
            <img
              src={`${import.meta.env.BASE_URL}300px-Thai_government_Garuda.jpg`}
              alt="ครุฑ"
              className="absolute left-0 h-16 w-auto"
            />
            <h2 className="text-lg font-bold">บันทึกข้อความ</h2>
          </div>

          <div className="mt-[1cm] flex items-baseline gap-1">
            <span className="shrink-0 font-bold">ส่วนราชการ</span>
            <span className="flex-1 border-b border-black">
              {printLog.departmentName ? `แผนกวิชา${printLog.departmentName}` : ''} วิทยาลัยเทคนิคระยอง
            </span>
          </div>
          <div className="mt-1 flex items-end gap-1">
            <span className="shrink-0">ที่</span>
            <span className="flex-1 border-b border-black">{printLog.docNumber || ' '}</span>
            <span className="shrink-0">วันที่</span>
            <span className="flex-1 border-b border-black">{formatThaiDate(printLog.sessionDate)}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="shrink-0 font-bold">เรื่อง</span>
            <span className="flex-1 border-b border-black">
              รายงานการพบนักเรียน นักศึกษา ครั้งที่ {printLog.sessionNumber} ภาคเรียนที่ {printLog.semester} ปีการศึกษา{' '}
              {printLog.academicYear}
            </span>
          </div>

          <hr className="mt-[0.5cm] border-t-2 border-black" />

          <p className="mt-3">
            <span className="font-bold">เรียน</span> ผู้อำนวยการวิทยาลัยเทคนิคระยอง
          </p>

          <p className="mt-3 indent-8 text-justify">
            ตามที่วิทยาลัยเทคนิคระยอง ได้มอบหมายให้ข้าพเจ้าทำหน้าที่ครูที่ปรึกษาชั้น {printLog.className} มีนักเรียน
            นักศึกษาในความดูแลจำนวน {printLog.totalStudents} คน กำหนดพบนักเรียนนักศึกษา ครั้งที่ {printLog.sessionNumber}{' '}
            ของภาคเรียนนี้ในวันที่ {formatThaiDate(printLog.sessionDate)} นั้น
          </p>
          <p className="mt-3 indent-8 text-justify">
            ข้าพเจ้าได้ปฏิบัติหน้าที่เรียบร้อยแล้ว มีนักเรียนมาพบครั้งนี้จำนวน {printLog.totalStudents - printLog.absentStudents.length}{' '}
            คน ขาด {printLog.absentStudents.length} คน มีรายละเอียดการดูแลนักเรียน และการให้คำปรึกษา ดังนี้
          </p>

          <div className="mt-3">
            <p className="indent-8 text-justify">1. เรื่องที่ปรึกษา / คำแนะนำ / ปัญหาที่พบและการแก้ไข การแต่งกาย การมาเรียน</p>
            <p className="indent-16 text-justify">{printLog.detail || '-'}</p>
          </div>

          <div className="mt-3">
            <p className="indent-8 text-justify">2. รายชื่อนักเรียนที่ขาด</p>
            <p className="indent-16 text-justify">
              {printLog.absentStudents.length > 0 ? printLog.absentStudents.map((s) => s.studentName).join(', ') : '-ไม่มี-'}
            </p>
          </div>

          <p className="mt-3 indent-8 text-justify">จึงเรียนมาเพื่อโปรดพิจารณา</p>

          <div className="mt-10 flex justify-end">
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({printLog.advisorTeacherName || '.............................................'})</p>
              <p>ครูที่ปรึกษา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({printLog.deptHeadName || '.............................................'})</p>
              <p>หัวหน้าแผนกวิชา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({printLog.advisorHeadName || '.............................................'})</p>
              <p>หัวหน้างานครูที่ปรึกษาและการแนะแนว</p>
            </div>
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({printLog.deputyDirectorName || '.............................................'})</p>
              <p>รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา</p>
            </div>
          </div>

          {printLog.images.length > 0 && (
            <div className="break-before-page">
              <h2 className="text-center text-base font-bold">ภาพประกอบการพบนักเรียน นักศึกษา</h2>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {printLog.images.map((url) => (
                  <div key={url} className="border border-black p-1">
                    <img src={url} alt="" className="h-64 w-auto object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
