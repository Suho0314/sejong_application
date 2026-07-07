import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from '../../lib/auth';

export function ProtectedRoute() {
  const location = useLocation();

  if (!isAdminAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
