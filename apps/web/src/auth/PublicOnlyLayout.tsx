import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './auth.store';

export function PublicOnlyLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === 'idle') return null;
  if (status === 'authenticated') {
    const destination = user?.email.trim().toLowerCase() === 'agent_ia@teste.com' ? '/agents' : '/';
    return <Navigate to={destination} replace />;
  }
  return <Outlet />;
}
