import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from './shell/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { EmployeeListPage } from '@/features/employees/EmployeeListPage';
import { EmployeeDetailPage } from '@/features/employees/EmployeeDetailPage';
import { LeadListPage } from '@/features/leads/LeadListPage';
import { LeadDetailPage } from '@/features/leads/LeadDetailPage';
import { StudentListPage } from '@/features/students/StudentListPage';
import { StudentDetailPage } from '@/features/students/StudentDetailPage';

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedLayout() {
  const { user, isReady } = useAuthStore();
  if (!isReady) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function PublicLayout() {
  const { user, isReady } = useAuthStore();
  if (!isReady) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: '/dashboard',
        element: <DashboardPage />,
        handle: { breadcrumb: 'Dashboard' },
      },
      {
        path: '/employees',
        element: <EmployeeListPage />,
        handle: { breadcrumb: 'Employees' },
      },
      {
        path: '/employees/:id',
        element: <EmployeeDetailPage />,
        handle: { breadcrumb: 'Employee Details' },
      },
      {
        path: '/leads',
        element: <LeadListPage />,
        handle: { breadcrumb: 'Leads' },
      },
      {
        path: '/leads/:id',
        element: <LeadDetailPage />,
        handle: { breadcrumb: 'Lead Details' },
      },
      {
        path: '/students',
        element: <StudentListPage />,
        handle: { breadcrumb: 'Students' },
      },
      {
        path: '/students/:id',
        element: <StudentDetailPage />,
        handle: { breadcrumb: 'Student Details' },
      },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
