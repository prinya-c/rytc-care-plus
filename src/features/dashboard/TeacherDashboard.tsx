import { useAsync } from '../../hooks/useAsync';
import { fetchTeacherDashboard } from './api';
import { StatCard } from '../../components/ui/Card';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Icon } from '../../components/ui/Icon';
import type { UserProfile } from '../../types';

export default function TeacherDashboard({ profile }: { profile: UserProfile }) {
  const { data, loading, error, refetch } = useAsync(
    () => fetchTeacherDashboard(profile.teacherId ?? profile.uid, profile.classIds ?? []),
    [profile.teacherId, profile.uid, JSON.stringify(profile.classIds)],
  );

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">สวัสดี, {profile.displayName}</h1>
        <p className="text-sm text-gray-500">ภาพรวมห้องเรียนที่คุณรับผิดชอบ</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard label="นักเรียนทั้งหมด" value={data.totalStudents} icon={<Icon name="users" />} />
        <StatCard label="คัดกรองแล้ว" value={data.screenedCount} tone="trust" icon={<Icon name="clipboard" />} />
        <StatCard
          label="ยังไม่คัดกรอง"
          value={data.unscreenedCount}
          tone="concern"
          icon={<Icon name="clipboard" />}
          to="/screenings"
        />
        <StatCard label="ส่งต่อแล้ว" value={data.referredCount} icon={<Icon name="send" />} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">ผลการคัดกรองตามกลุ่ม</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="กลุ่มไว้ใจ" value={data.trustCount} tone="trust" />
          <StatCard label="กลุ่มห่วงใย" value={data.concernCount} tone="concern" />
          <StatCard label="กลุ่มใกล้ชิด" value={data.closeCount} tone="close" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">สถานะการเยี่ยมบ้าน</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="เยี่ยมบ้านแล้ว" value={data.visitedCount} tone="trust" icon={<Icon name="map" />} />
          <StatCard label="ยังไม่ได้เยี่ยมบ้าน" value={data.unvisitedCount} tone="concern" icon={<Icon name="map" />} />
        </div>
      </div>
    </div>
  );
}
