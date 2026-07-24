import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllUsers, upsertUserProfile, updateUserProfile, setUserActive } from './api';
import { fetchAllTeachers, fetchAllClasses } from '../students/api';
import { hashPassword } from '../../lib/passwordHash';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Field, Input, Select, Button } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { ROLE_LABEL } from '../../utils/rbac';
import type { UserProfile, UserRole } from '../../types';

const ROLE_OPTIONS: UserRole[] = [
  'advisor_teacher',
  'advisor_staff',
  'guidance_staff',
  'scholarship_staff',
  'rehabilitation_staff',
  'admin',
];

export default function UserManagementPage() {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const { data, loading, error, refetch } = useAsync(async () => {
    const [users, teachers, classes] = await Promise.all([fetchAllUsers(), fetchAllTeachers(), fetchAllClasses()]);
    return { users, teachers, classes };
  }, []);

  const [citizenId, setCitizenId] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('advisor_staff');
  const [teacherId, setTeacherId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [classIdsInput, setClassIdsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  async function handleCreate() {
    if (!citizenId.trim() || !tempPassword.trim() || !displayName.trim()) {
      showToast('กรุณากรอกเลขบัตรประชาชน รหัสผ่านเริ่มต้น และชื่อผู้ใช้ให้ครบถ้วน', 'error');
      return;
    }
    if (!/^\d{13}$/.test(citizenId.trim())) {
      showToast('เลขบัตรประชาชนต้องมี 13 หลัก', 'error');
      return;
    }
    setSaving(true);
    try {
      const { hash, salt } = await hashPassword(tempPassword.trim());
      await upsertUserProfile(citizenId.trim(), {
        authProvider: 'custom',
        citizenId: citizenId.trim(),
        passwordHash: hash,
        passwordSalt: salt,
        displayName: displayName.trim(),
        role,
        teacherId: teacherId.trim() || undefined,
        departmentId: departmentId.trim() || undefined,
        classIds: classIdsInput
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        isActive: true,
      });
      showToast('สร้างบัญชีผู้ใช้งานสำเร็จ — แจ้งเลขบัตรประชาชนและรหัสผ่านเริ่มต้นให้ผู้ใช้เพื่อเข้าสู่ระบบ');
      setCitizenId('');
      setTempPassword('');
      setDisplayName('');
      setTeacherId('');
      setDepartmentId('');
      setClassIdsInput('');
      refetch();
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(targetUid: string, isActive: boolean) {
    const ok = await confirm({
      title: isActive ? 'เปิดใช้งานผู้ใช้นี้' : 'ระงับการใช้งานผู้ใช้นี้',
      description: isActive ? 'ผู้ใช้จะสามารถเข้าสู่ระบบได้อีกครั้ง' : 'ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง',
      tone: isActive ? 'default' : 'danger',
    });
    if (!ok) return;
    try {
      await setUserActive(targetUid, isActive);
      showToast('อัปเดตสถานะสำเร็จ');
      refetch();
    } catch {
      showToast('ดำเนินการไม่สำเร็จ', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">จัดการผู้ใช้งาน</h1>
        <p className="text-sm text-gray-500">ทั้งหมด {data.users.length} คน</p>
      </div>

      <Card>
        <CardHeader
          title="สร้างบัญชีเจ้าหน้าที่ (นอกเหนือจากครูที่ปรึกษา)"
          subtitle="ครูที่ปรึกษาลงทะเบียนด้วยตนเองผ่านหน้า /register ส่วนนี้ใช้สร้างบัญชีให้เจ้าหน้าที่งานแนะแนว/ทุน/บำบัด/ครูที่ปรึกษา/แอดมิน ที่ไม่ได้ลงทะเบียนเอง"
        />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="เลขประจำตัวประชาชน 13 หลัก" required hint="ใช้เป็นรหัสผู้ใช้สำหรับเข้าสู่ระบบ">
              <Input
                inputMode="numeric"
                maxLength={13}
                value={citizenId}
                onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890123"
              />
            </Field>
            <Field label="รหัสผ่านเริ่มต้น" required hint="แจ้งให้ผู้ใช้ทราบเพื่อเข้าสู่ระบบครั้งแรก">
              <Input value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
            </Field>
            <Field label="ชื่อ-สกุล" required>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <Field label="บทบาท" required>
              <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="รหัสครู (teacherId)" hint="สำหรับครูที่ปรึกษา">
              <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">ไม่ระบุ</option>
                {data.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tname}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="สาขาวิชา (departmentId)">
              <Input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
            </Field>
          </div>
          <Field label="กลุ่มเรียนที่รับผิดชอบ (classIds)" hint="คั่นด้วยเครื่องหมายจุลภาค (,) สำหรับครูที่ปรึกษา">
            <Input value={classIdsInput} onChange={(e) => setClassIdsInput(e.target.value)} placeholder="เช่น ปวช1-1,ปวช1-2" />
          </Field>
          <Button variant="primary" loading={saving} onClick={handleCreate}>
            สร้างบัญชีผู้ใช้งาน
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="รายชื่อผู้ใช้งานในระบบ" subtitle="บัญชีที่ลงทะเบียนเองจะรอสถานะ &quot;รอเปิดใช้งาน&quot; — กดแก้ไขเพื่อกำหนดบทบาทและห้องเรียนก่อนเปิดใช้งาน" />
        <CardBody className="p-0">
          {data.users.length === 0 ? (
            <EmptyState title="ยังไม่มีผู้ใช้งานในระบบ" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.users.map((u) => (
                <UserRow
                  key={u.uid}
                  user={u}
                  teachers={data.teachers}
                  editing={editingUid === u.uid}
                  onEditToggle={() => setEditingUid(editingUid === u.uid ? null : u.uid)}
                  onToggleActive={() => handleToggleActive(u.uid, !u.isActive)}
                  onSaved={() => {
                    setEditingUid(null);
                    refetch();
                  }}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  teachers,
  editing,
  onEditToggle,
  onToggleActive,
  onSaved,
}: {
  user: UserProfile;
  teachers: { id: string; tname: string }[];
  editing: boolean;
  onEditToggle: () => void;
  onToggleActive: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [role, setRole] = useState<UserRole>(user.role);
  const [teacherId, setTeacherId] = useState(user.teacherId ?? '');
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? '');
  const [classIdsInput, setClassIdsInput] = useState((user.classIds ?? []).join(','));
  const [saving, setSaving] = useState(false);

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        role,
        teacherId: teacherId.trim() || undefined,
        departmentId: departmentId.trim() || undefined,
        classIds: classIdsInput
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      });
      showToast('บันทึกการแก้ไขสำเร็จ');
      onSaved();
    } catch {
      showToast('บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
            <Badge tone={user.isActive ? 'green' : 'gray'}>{user.isActive ? 'ใช้งานอยู่' : 'รอเปิดใช้งาน / ระงับ'}</Badge>
          </div>
          <p className="text-xs text-gray-500">
            {user.citizenId ?? user.email} · {ROLE_LABEL[user.role]}
            {user.position ? ` · ${user.position}` : ''}
            {user.departmentName ? ` · ${user.departmentName}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={onEditToggle}>
            {editing ? 'ปิด' : 'แก้ไข'}
          </Button>
          <Button variant={user.isActive ? 'secondary' : 'primary'} onClick={onToggleActive}>
            {user.isActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="บทบาท">
              <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="รหัสครู (teacherId)">
              <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">ไม่ระบุ</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tname}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="สาขาวิชา (departmentId)">
              <Input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
            </Field>
            <Field label="กลุ่มเรียนที่รับผิดชอบ (classIds)" hint="คั่นด้วย ,">
              <Input value={classIdsInput} onChange={(e) => setClassIdsInput(e.target.value)} />
            </Field>
          </div>
          <Button variant="primary" loading={saving} onClick={handleSaveEdit}>
            บันทึกการแก้ไข
          </Button>
        </div>
      )}
    </li>
  );
}
