import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllClasses } from './api';
import { updateUserProfile } from '../users/api';
import { ClassMultiSelect } from './ClassMultiSelect';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';

export default function MyClassesPage() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { data: classes, loading, error, refetch } = useAsync(() => fetchAllClasses(), []);
  const [selectedClassCodes, setSelectedClassCodes] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  if (!profile) return null;
  if (loading) return <LoadingState />;
  if (error || !classes) return <ErrorState onRetry={refetch} />;

  const current = selectedClassCodes ?? profile.classIds ?? [];

  function toggleClass(classCode: string) {
    setSelectedClassCodes(current.includes(classCode) ? current.filter((c) => c !== classCode) : [...current, classCode]);
  }

  function addClass(classCode: string) {
    if (current.includes(classCode)) return;
    setSelectedClassCodes([...current, classCode]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserProfile(profile!.uid, { classIds: current });
      await refreshProfile();
      showToast('บันทึกกลุ่มเรียนที่รับผิดชอบสำเร็จ');
      setSelectedClassCodes(null);
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = selectedClassCodes !== null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">กลุ่มเรียนของฉัน</h1>
        <p className="text-sm text-gray-500">
          กลุ่มเรียนที่ท่านเป็นครูที่ปรึกษา — มีผลต่อรายชื่อผู้เรียนและแดชบอร์ดที่มองเห็น
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <span className="mb-3 block text-sm font-medium text-gray-700">เลือกได้มากกว่า 1 กลุ่มเรียน</span>

        <ClassMultiSelect classes={classes} selectedClassCodes={current} onToggle={toggleClass} onAdd={addClass} />

        <div className="mt-4 flex justify-end gap-2">
          {hasChanges && (
            <Button variant="ghost" onClick={() => setSelectedClassCodes(null)} type="button">
              ยกเลิกการแก้ไข
            </Button>
          )}
          <Button variant="primary" loading={saving} disabled={!hasChanges} onClick={handleSave} type="button">
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
