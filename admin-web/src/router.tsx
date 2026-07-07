import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { CohortPage } from './pages/admin/cohort';
import { DashboardPage } from './pages/admin/dashboard';
import { QuestionPage } from './pages/admin/question';
import { ScorePage } from './pages/admin/score';
import { SettingsPage } from './pages/admin/settings';
import { StudentPage } from './pages/admin/student';
import { WorkbookAssignmentPage } from './pages/admin/workbook-assignment';
import { WorkbookPage } from './pages/admin/workbook';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'cohorts', element: <CohortPage /> },
          { path: 'students', element: <StudentPage /> },
          { path: 'questions', element: <QuestionPage /> },
          { path: 'workbooks', element: <WorkbookPage /> },
          { path: 'workbook-assignments', element: <WorkbookAssignmentPage /> },
          { path: 'scores', element: <ScorePage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
