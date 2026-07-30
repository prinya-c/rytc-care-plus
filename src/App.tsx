import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { StudentAuthProvider } from './features/studentAuth/StudentAuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import ProtectedRoute from './routes/ProtectedRoute';
import StudentProtectedRoute from './routes/StudentProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { FullPageLoading } from './components/ui/States';

import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const StudentListPage = lazy(() => import('./features/students/StudentListPage'));
const MyClassesPage = lazy(() => import('./features/students/MyClassesPage'));
const ScreeningRoundListPage = lazy(() => import('./features/screenings/ScreeningRoundListPage'));
const BulkScreeningPage = lazy(() => import('./features/screenings/BulkScreeningPage'));
const ScreeningSummaryPage = lazy(() => import('./features/screenings/ScreeningSummaryPage'));
const HomeVisitListPage = lazy(() => import('./features/homeVisits/HomeVisitListPage'));
const HomeVisitFormPage = lazy(() => import('./features/homeVisits/HomeVisitFormPage'));
const HomeVisitSummaryPage = lazy(() => import('./features/homeVisits/HomeVisitSummaryPage'));
const StudentHomeVisitPage = lazy(() => import('./features/homeVisits/StudentHomeVisitPage'));
const StudentInfoListPage = lazy(() => import('./features/homeVisits/StudentInfoListPage'));
const StudentInfoFormPage = lazy(() => import('./features/homeVisits/StudentInfoFormPage'));
const HomeVisitMemoListPage = lazy(() => import('./features/homeVisits/HomeVisitMemoListPage'));
const HomeVisitMemoFormPage = lazy(() => import('./features/homeVisits/HomeVisitMemoFormPage'));
const HomeVisitMemoDetailPage = lazy(() => import('./features/homeVisits/HomeVisitMemoDetailPage'));
const HomeroomLogListPage = lazy(() => import('./features/homeroom/HomeroomLogListPage'));
const HomeroomLogFormPage = lazy(() => import('./features/homeroom/HomeroomLogFormPage'));
const HomeroomLogDetailPage = lazy(() => import('./features/homeroom/HomeroomLogDetailPage'));
const DropoutFollowUpListPage = lazy(() => import('./features/dropoutFollowUp/DropoutFollowUpListPage'));
const DropoutFollowUpFormPage = lazy(() => import('./features/dropoutFollowUp/DropoutFollowUpFormPage'));
const ReferralListPage = lazy(() => import('./features/referrals/ReferralListPage'));
const ReferralFormPage = lazy(() => import('./features/referrals/ReferralFormPage'));
const ReferralInboxPage = lazy(() => import('./features/referrals/ReferralInboxPage'));
const ReferralDetailPage = lazy(() => import('./features/referrals/ReferralDetailPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const UserManagementPage = lazy(() => import('./features/users/UserManagementPage'));
const SignatorySettingsPage = lazy(() => import('./features/settings/SignatorySettingsPage'));

const STAFF_ROLES = ['admin', 'advisor_teacher', 'advisor_staff'] as const;
const OFFICER_ROLES = ['advisor_staff', 'guidance_staff', 'scholarship_staff', 'discipline_staff', 'rehabilitation_staff'] as const;
const MANAGE_ROLES = ['admin', 'advisor_staff'] as const;
const ADMIN_ONLY_ROLES = ['admin'] as const;

export default function App() {
  return (
    <BrowserRouter basename="/rytc-care-plus">
      <AuthProvider>
        <StudentAuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Suspense fallback={<FullPageLoading />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  <Route element={<StudentProtectedRoute />}>
                    <Route path="/student/home-visit" element={<StudentHomeVisitPage />} />
                  </Route>

                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/dashboard" element={<DashboardPage />} />

                      <Route element={<ProtectedRoute allowedRoles={['admin', 'advisor_teacher']} />}>
                        <Route path="/my-classes" element={<MyClassesPage />} />
                        <Route path="/screenings" element={<ScreeningRoundListPage />} />
                        <Route path="/screenings/:academicYear/:semester" element={<BulkScreeningPage />} />
                      </Route>

                      <Route element={<ProtectedRoute allowedRoles={[...STAFF_ROLES]} />}>
                        <Route path="/students" element={<StudentListPage />} />
                        <Route path="/screenings/summary" element={<ScreeningSummaryPage />} />
                        <Route path="/student-info" element={<StudentInfoListPage />} />
                        <Route path="/student-info/:studentId" element={<StudentInfoFormPage />} />
                        <Route path="/home-visits" element={<HomeVisitListPage />} />
                        <Route path="/home-visits/memo" element={<HomeVisitMemoListPage />} />
                        <Route path="/home-visits/memo/new" element={<HomeVisitMemoFormPage />} />
                        <Route path="/home-visits/memo/:memoId/edit" element={<HomeVisitMemoFormPage />} />
                        <Route path="/home-visits/memo/:memoId" element={<HomeVisitMemoDetailPage />} />
                        <Route path="/home-visits/new/:studentId" element={<HomeVisitFormPage />} />
                        <Route path="/home-visits/:visitId/edit" element={<HomeVisitFormPage />} />
                        <Route path="/home-visits/summary" element={<HomeVisitSummaryPage />} />
                        <Route path="/homeroom" element={<HomeroomLogListPage />} />
                        <Route path="/homeroom/new" element={<HomeroomLogFormPage />} />
                        <Route path="/homeroom/:logId" element={<HomeroomLogDetailPage />} />
                        <Route path="/homeroom/:logId/edit" element={<HomeroomLogFormPage />} />
                        <Route path="/dropout-follow-up" element={<DropoutFollowUpListPage />} />
                        <Route path="/dropout-follow-up/new" element={<DropoutFollowUpFormPage />} />
                        <Route path="/dropout-follow-up/:id/edit" element={<DropoutFollowUpFormPage />} />
                        <Route path="/referrals" element={<ReferralListPage />} />
                        <Route path="/referrals/new" element={<ReferralFormPage />} />
                        <Route path="/referrals/new/:studentId" element={<ReferralFormPage />} />
                        <Route path="/referrals/:id/edit" element={<ReferralFormPage />} />
                      </Route>

                      <Route element={<ProtectedRoute allowedRoles={[...OFFICER_ROLES]} />}>
                        <Route path="/referral-inbox" element={<ReferralInboxPage />} />
                        <Route path="/referrals/:referralId" element={<ReferralDetailPage />} />
                      </Route>

                      <Route element={<ProtectedRoute allowedRoles={[...MANAGE_ROLES]} />}>
                        <Route path="/reports" element={<ReportsPage />} />
                      </Route>

                      <Route element={<ProtectedRoute allowedRoles={[...ADMIN_ONLY_ROLES]} />}>
                        <Route path="/users" element={<UserManagementPage />} />
                        <Route path="/settings/signatories" element={<SignatorySettingsPage />} />
                      </Route>

                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </ConfirmProvider>
          </ToastProvider>
        </StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
