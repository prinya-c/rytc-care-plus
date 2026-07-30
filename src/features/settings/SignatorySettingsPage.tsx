import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllSignatorySettings, upsertSignatorySettings } from './api';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Field, Input, Select, Button } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import type { SignatorySettings } from '../../types';

const currentAcademicYear = String(new Date().getFullYear() + 543);

function SignatoryForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: SignatorySettings;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [academicYear, setAcademicYear] = useState(initial?.academicYear ?? currentAcademicYear);
  const [semester, setSemester] = useState(initial?.semester ?? '1');
  const [advisorHeadName, setAdvisorHeadName] = useState(initial?.advisorHeadName ?? '');
  const [deputyDirectorName, setDeputyDirectorName] = useState(initial?.deputyDirectorName ?? '');
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await upsertSignatorySettings(
        academicYear,
        semester,
        { advisorHeadName: advisorHeadName.trim(), deputyDirectorName: deputyDirectorName.trim(), updatedBy: profile.uid },
        { isNew: !isEdit },
      );
      showToast('บันทึกการตั้งค่าสำเร็จ');
      onSaved();
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="ปีการศึกษา" required>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} disabled={isEdit} />
        </Field>
        <Field label="ภาคเรียนที่" required>
          <Select value={semester} onChange={(e) => setSemester(e.target.value)} disabled={isEdit}>
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2">ภาคเรียนที่ 2</option>
          </Select>
        </Field>
        <Field label="หัวหน้างานครูที่ปรึกษาและการแนะแนว" hint="ชื่อที่จะแสดงในเอกสารพิมพ์ทุกฉบับของภาคเรียนนี้">
          <Input value={advisorHeadName} onChange={(e) => setAdvisorHeadName(e.target.value)} placeholder="เช่น นางสาวสิริขวัญ นพสันเทียะ" />
        </Field>
        <Field label="รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา" hint="ชื่อที่จะแสดงในเอกสารพิมพ์ทุกฉบับของภาคเรียนนี้">
          <Input value={deputyDirectorName} onChange={(e) => setDeputyDirectorName(e.target.value)} placeholder="เช่น นายชาคริต รุ่งรัตน์" />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button variant="primary" loading={saving} disabled={!academicYear || !semester} onClick={handleSave}>
          บันทึก
        </Button>
      </div>
    </div>
  );
}

export default function SignatorySettingsPage() {
  const { data, loading, error, refetch } = useAsync(fetchAllSignatorySettings, []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ตั้งค่าชื่อผู้ลงนาม</h1>
        <p className="text-sm text-gray-500">
          กำหนดชื่อหัวหน้างานครูที่ปรึกษาและการแนะแนว และรองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา แยกตามปีการศึกษา/ภาคเรียน
          เนื่องจากทั้งสองตำแหน่งเปลี่ยนแปลงบ่อย — เอกสารพิมพ์ทุกฉบับ (คัดกรอง, เยี่ยมบ้าน, โฮมรูม) จะดึงชื่อจากที่นี่โดยอัตโนมัติตามภาคเรียนของบันทึกนั้นๆ
        </p>
      </div>

      <Card>
        <CardHeader
          title="เพิ่มการตั้งค่าปีการศึกษา/ภาคเรียนใหม่"
          action={
            !showAddForm && (
              <Button variant="secondary" onClick={() => setShowAddForm(true)}>
                + เพิ่ม
              </Button>
            )
          }
        />
        {showAddForm && (
          <CardBody>
            <SignatoryForm
              onSaved={() => {
                setShowAddForm(false);
                refetch();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader title="รายการที่ตั้งค่าไว้" subtitle="เรียงจากปีการศึกษา/ภาคเรียนล่าสุด" />
        <CardBody className={data.length === 0 ? '' : 'space-y-4 divide-y divide-gray-100'}>
          {data.length === 0 ? (
            <EmptyState title="ยังไม่มีการตั้งค่า" description="เพิ่มปีการศึกษา/ภาคเรียนแรกด้านบน" />
          ) : (
            data.map((s, i) =>
              editingId === s.id ? (
                <div key={s.id} className={i > 0 ? 'pt-4' : ''}>
                  <SignatoryForm initial={s} onSaved={() => { setEditingId(null); refetch(); }} onCancel={() => setEditingId(null)} />
                </div>
              ) : (
                <div key={s.id} className={`flex items-center justify-between gap-3 ${i > 0 ? 'pt-4' : ''}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      ภาคเรียนที่ {s.semester} ปีการศึกษา {s.academicYear}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      หัวหน้างานครูที่ปรึกษาและการแนะแนว: {s.advisorHeadName || '(ยังไม่ระบุ)'}
                    </p>
                    <p className="text-xs text-gray-500">
                      รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา: {s.deputyDirectorName || '(ยังไม่ระบุ)'}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setEditingId(s.id)}>
                    แก้ไข
                  </Button>
                </div>
              ),
            )
          )}
        </CardBody>
      </Card>
    </div>
  );
}
