/**
 * Where Supabase should send the user after they click "confirm email" (or similar auth links).
 *
 * Must match an entry under Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
 * (e.g. `https://your-domain.com/login` or `https://your-domain.com/**`).
 *
 * If admins invite users while running the app on **localhost**, set `VITE_PUBLIC_APP_URL`
 * in `.env` to your **production** site (same as QR codes). Otherwise the email link will
 * point at localhost and will fail on phones or when the dev server is off.
 */
export function getAuthEmailRedirectUrl(): string {
  const fromEnv = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim().replace(/\/$/, '');
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return `${fromEnv}/login`;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }
  return 'http://localhost:5173/login';
}
