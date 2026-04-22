import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/** Only allow in-app relative paths (blocks open redirects). */
function isSafeInternalReturnPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.includes('//') || trimmed.toLowerCase().includes('://')) return false;
  if (trimmed.startsWith('/login')) return false;
  return true;
}

/**
 * After authentication, `/login` should send users to `?returnTo=` when present
 * (e.g. QR check-in deep link), otherwise to the role home route.
 */
export default function PostLoginRedirect() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  if (returnTo && isSafeInternalReturnPath(returnTo)) {
    return <Navigate to={returnTo} replace />;
  }

  const home =
    user?.role === 'admin' || user?.role === 'super_admin' ? '/admin' : '/member';
  return <Navigate to={home} replace />;
}
