import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { FullPageLoading } from './components/ui/States';

import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const StudentListPage = lazy(() => import('./features/students/StudentListPage'));
const MyClassesPage = lazy(() => import('./features/students/MyClassesPage'));
const BulkScreeningPage = lazy(() => import('./features/screenings/BulkScreeningPage'));
const ScreeningSummaryPage = lazy(() => import('./features/screenings/ScreeningSummaryPage'));
const HomeVisitFormPage = lazy(() => import('./features/homeVisits/HomeVisitFormPage'));
const HomeVisitSummaryPage = lazy(() => import('./features/homeVisits/HomeVisitSummaryPage'));
const ReferralFormPage = lazy(() => import('./features/referrals/ReferralFormPage'));
const ReferralInboxPage = lazy(() => import('./features/referrals/ReferralInboxPage'));
const ReferralDetailPage = lazy(() => import('./features/referrals/ReferralDetailPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const UserManagementPage = lazy(() => import('./features/users/UserManagementPage'));

const STAFF_ROLES = ['admin', 'advisor_teacher', 'advisor_staff'] as const;
const OFFICER_ROLES = ['admin', 'guidance_staff', 'scholarship_staff', 'rehabilitation_staff'] as const;
const MANAGE_ROLES = ['admin', 'advisor_staff'] as const;

export default function App() {
  return (
    <BrowserRouter basename="/rytc-care-plus">
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Suspense fallback={<FullPageLoading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />

                  <Route element={<ProtectedRoute allowedRoles={['admin', 'advisor_teacher']} />}>
                    <Route path="/my-classes" element={<MyClassesPage />} />
                    <Route path="/screenings" element={<BulkScreeningPage />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={[...STAFF_ROLES]} />}>
                    <Route path="/students" element={<StudentListPage />} />
                    <Route path="/screenings/summary" element={<ScreeningSummaryPage />} />
                    <Route path="/home-visits/new/:studentId" element={<HomeVisitFormPage />} />
                    <Route path="/home-visits/:visitId/edit" element={<HomeVisitFormPage />} />
                    <Route path="/home-visits/summary" element={<HomeVisitSummaryPage />} />
                    <Route path="/referrals/new/:studentId" element={<ReferralFormPage />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={[...OFFICER_ROLES]} />}>
                    <Route path="/referral-inbox" element={<ReferralInboxPage />} />
                    <Route path="/referrals/:referralId" element={<ReferralDetailPage />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={[...MANAGE_ROLES]} />}>
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/users" element={<UserManagementPage />} />
                  </Route>

                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </Suspense>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
