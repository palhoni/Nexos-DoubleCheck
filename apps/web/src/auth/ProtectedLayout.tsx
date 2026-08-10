import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './auth.store';

export function ProtectedLayout() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'idle') return null;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
