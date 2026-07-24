import { useAuth } from '../auth/AuthContext';
import TeacherDashboard from './TeacherDashboard';
import StaffDashboard from './StaffDashboard';
import OfficerDashboard from './OfficerDashboard';
import { isOfficer, canViewCollegeOverview, isAdvisorTeacher } from '../../utils/rbac';
import { EmptyState } from '../../components/ui/States';

export default function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return null;

  if (isAdvisorTeacher(profile.role)) return <TeacherDashboard profile={profile} />;
  if (canViewCollegeOverview(profile.role)) return <StaffDashboard />;
  if (isOfficer(profile.role)) return <OfficerDashboard profile={profile} />;

  return <EmptyState title="ไม่พบแดชบอร์ดสำหรับบทบาทนี้" />;
}
