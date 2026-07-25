import { Navigate, Outlet } from 'react-router-dom';
import { useStudentAuth } from '../features/studentAuth/StudentAuthContext';
import { FullPageLoading } from '../components/ui/States';

export default function StudentProtectedRoute() {
  const { student, loading } = useStudentAuth();

  if (loading) return <FullPageLoading />;
  if (!student) return <Navigate to="/login" replace />;

  return <Outlet />;
}
