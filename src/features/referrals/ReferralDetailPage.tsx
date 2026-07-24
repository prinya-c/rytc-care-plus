import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchReferralById, updateReferralStatus } from './api';
import { fetchInterventionsByReferral, createIntervention, fetchFollowUpResultsByReferral, createFollowUpResult } from '../interventions/api';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Section, Field, Select, Textarea, Input, Button } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import {
  REFERRAL_PRIORITY_LABEL,
  REFERRAL_STATUS_LABEL,
  INTERVENTION_ACTION_TYPE_LABEL,
  FINAL_RESULT_LABEL,
  type InterventionActionType,
  type FinalResult,
  type ReferralStatus,
} from '../../types';

export default function ReferralDetailPage() {
  const { referralId } = useParams();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const { data, loading, error, refetch } = useAsync(async () => {
    const [referral, interventions, followUps] = await Promise.all([
      fetchReferralById(referralId!),
      fetchInterventionsByReferral(referralId!),
      fetchFollowUpResultsByReferral(referralId!),
    ]);
    return { referral, interventions, followUps };
  }, [referralId]);

  const [actionType, setActionType] = useState<InterventionActionType>('counseling');
  const [actionDate, setActionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [actionDetail, setActionDetail] = useState('');
  const [result, setResult] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextAppointmentDate, setNextAppointmentDate] = useState('');
  const [savingIntervention, setSavingIntervention] = useState(false);

  const [finalResult, setFinalResult] = useState<FinalResult>('improved');
  const [summary, setSummary] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [closing, setClosing] = useState(false);

  if (loading) return <LoadingState />;
  if (error || !data || !data.referral) return <ErrorState title="ไม่พบข้อมูลการส่งต่อ" description="" />;

  const { referral, interventions, followUps } = data;

  async function handleStatusChange(status: ReferralStatus) {
    const ok = await confirm({
      title: `เปลี่ยนสถานะเป็น "${REFERRAL_STATUS_LABEL[status]}"`,
      description: 'ยืนยันการเปลี่ยนสถานะรายการส่งต่อนี้',
    });
    if (!ok) return;
    try {
      await updateReferralStatus(referral!.id, status);
      showToast('เปลี่ยนสถานะสำเร็จ');
      refetch();
    } catch {
      showToast('ดำเนินการไม่สำเร็จ', 'error');
    }
  }

  async function handleAddIntervention() {
    if (!profile || !actionDetail.trim()) {
      showToast('กรุณากรอกรายละเอียดการดำเนินการ', 'error');
      return;
    }
    setSavingIntervention(true);
    try {
      await createIntervention({
        referralId: referral!.id,
        studentId: referral!.studentId,
        targetWork: referral!.targetWork,
        officerId: profile.uid,
        officerName: profile.displayName,
        actionDate,
        actionType,
        actionDetail,
        result,
        nextAction,
        nextAppointmentDate: nextAppointmentDate || undefined,
        status: 'in_progress',
      });
      if (referral!.status === 'received') await updateReferralStatus(referral!.id, 'in_progress');
      showToast('บันทึกการดำเนินการสำเร็จ');
      setActionDetail('');
      setResult('');
      setNextAction('');
      setNextAppointmentDate('');
      refetch();
    } catch {
      showToast('บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSavingIntervention(false);
    }
  }

  async function handleCloseCase() {
    if (!profile || !summary.trim()) {
      showToast('กรุณากรอกสรุปผล', 'error');
      return;
    }
    const ok = await confirm({
      title: 'ปิดเคสนี้',
      description: 'เมื่อปิดเคสแล้ว สถานะการส่งต่อจะเปลี่ยนเป็น "ปิดเคสแล้ว"',
      tone: 'danger',
      confirmText: 'ปิดเคส',
    });
    if (!ok) return;
    setClosing(true);
    try {
      await createFollowUpResult({
        referralId: referral!.id,
        interventionId: interventions[0]?.id ?? '',
        studentId: referral!.studentId,
        targetWork: referral!.targetWork,
        resultDate: new Date().toISOString().slice(0, 10),
        finalResult,
        finalResultLabel: FINAL_RESULT_LABEL[finalResult],
        summary,
        recommendation,
        closedBy: profile.uid,
        closedAt: new Date().toISOString(),
      });
      await updateReferralStatus(referral!.id, 'closed');
      showToast('ปิดเคสสำเร็จ');
      refetch();
    } catch {
      showToast('ดำเนินการไม่สำเร็จ', 'error');
    } finally {
      setClosing(false);
    }
  }

  const isClosed = referral.status === 'closed';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{referral.studentName}</h1>
        <p className="text-sm text-gray-500">
          {referral.className} · {referral.targetWorkLabel}
        </p>
      </div>

      <Card>
        <CardHeader
          title="ข้อมูลการส่งต่อ"
          action={
            <div className="flex gap-2">
              <Badge tone={referral.priority === 'critical' ? 'red' : referral.priority === 'urgent' ? 'yellow' : 'gray'}>
                {REFERRAL_PRIORITY_LABEL[referral.priority]}
              </Badge>
              <Badge tone={isClosed ? 'gray' : 'blue'}>{REFERRAL_STATUS_LABEL[referral.status]}</Badge>
            </div>
          }
        />
        <CardBody className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="text-gray-400">ส่งต่อโดย:</span> {referral.referredByName} ({referral.referredDate})
          </p>
          <p>
            <span className="text-gray-400">เหตุผล:</span> {referral.reason}
          </p>
          {!isClosed && (
            <div className="flex flex-wrap gap-2 pt-2">
              {referral.status === 'in_progress' && (
                <Button variant="secondary" onClick={() => handleStatusChange('completed')}>
                  ทำเครื่องหมายว่าดำเนินการแล้ว
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="บันทึกการดำเนินการ" subtitle="เช่น ให้คำปรึกษา มอบทุน ประสานผู้ปกครอง ส่งตัวสถานพยาบาล" />
        <CardBody>
          {interventions.length > 0 && (
            <ul className="mb-4 space-y-2">
              {interventions.map((iv) => (
                <li key={iv.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{INTERVENTION_ACTION_TYPE_LABEL[iv.actionType]}</span>
                    <span className="text-xs text-gray-400">{iv.actionDate}</span>
                  </div>
                  <p className="mt-1 text-gray-600">{iv.actionDetail}</p>
                  {iv.result && <p className="mt-1 text-gray-500">ผลการดำเนินการ: {iv.result}</p>}
                  {iv.nextAction && <p className="mt-1 text-gray-500">นัดครั้งต่อไป: {iv.nextAction} {iv.nextAppointmentDate}</p>}
                </li>
              ))}
            </ul>
          )}

          {!isClosed && (
            <Section title="เพิ่มบันทึกใหม่">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="ประเภทกิจกรรม" required>
                  <Select value={actionType} onChange={(e) => setActionType(e.target.value as InterventionActionType)}>
                    {(Object.keys(INTERVENTION_ACTION_TYPE_LABEL) as InterventionActionType[]).map((t) => (
                      <option key={t} value={t}>
                        {INTERVENTION_ACTION_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="วันที่ดำเนินการ" required>
                  <Input type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} />
                </Field>
              </div>
              <Field label="รายละเอียดการดำเนินการ" required>
                <Textarea rows={3} value={actionDetail} onChange={(e) => setActionDetail(e.target.value)} />
              </Field>
              <Field label="ผลการดำเนินการ">
                <Textarea rows={2} value={result} onChange={(e) => setResult(e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="นัดติดตามครั้งต่อไป">
                  <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="รายละเอียดนัดหมาย" />
                </Field>
                <Field label="วันที่นัดครั้งต่อไป">
                  <Input type="date" value={nextAppointmentDate} onChange={(e) => setNextAppointmentDate(e.target.value)} />
                </Field>
              </div>
              <Button variant="primary" loading={savingIntervention} onClick={handleAddIntervention}>
                บันทึกการดำเนินการ
              </Button>
            </Section>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="ผลหลังดำเนินการ" />
        <CardBody>
          {followUps.length === 0 ? (
            <EmptyState title="ยังไม่มีการบันทึกผลหลังดำเนินการ" />
          ) : (
            <ul className="mb-4 space-y-2">
              {followUps.map((f) => (
                <li key={f.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge tone="green">{f.finalResultLabel}</Badge>
                    <span className="text-xs text-gray-400">{f.resultDate}</span>
                  </div>
                  <p className="mt-1 text-gray-600">{f.summary}</p>
                  {f.recommendation && <p className="mt-1 text-gray-500">ข้อเสนอแนะ: {f.recommendation}</p>}
                </li>
              ))}
            </ul>
          )}

          {!isClosed && (
            <Section title="บันทึกผลและปิดเคส">
              <Field label="ผลลัพธ์" required>
                <Select value={finalResult} onChange={(e) => setFinalResult(e.target.value as FinalResult)}>
                  {(Object.keys(FINAL_RESULT_LABEL) as FinalResult[]).map((r) => (
                    <option key={r} value={r}>
                      {FINAL_RESULT_LABEL[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="สรุปผล" required>
                <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </Field>
              <Field label="ข้อเสนอแนะ">
                <Textarea rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
              </Field>
              <Button variant="danger" loading={closing} onClick={handleCloseCase}>
                บันทึกผลและปิดเคส
              </Button>
            </Section>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
