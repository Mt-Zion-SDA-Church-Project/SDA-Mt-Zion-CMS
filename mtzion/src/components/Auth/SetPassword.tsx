import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const SetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const establishSessionFromUrl = async () => {
      setError(null);
      try {
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          setInitializing(false);
          return;
        }

        const url = new URL(window.location.href);
        const params = url.searchParams;
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = (params.get('type') as 'signup' | 'recovery' | 'email_change') || null;

        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;
        } else if (hash.get('access_token') && hash.get('refresh_token')) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: hash.get('access_token')!,
            refresh_token: hash.get('refresh_token')!,
          });
          if (setErr) throw setErr;
        } else if (tokenHash && type) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (verifyErr) throw verifyErr;
        }

        const { data: after } = await supabase.auth.getSession();
        if (!after.session) {
          throw new Error('Auth session missing. Re-open the confirmation email link and try again.');
        }

        // Avoid re-processing one-time auth params on refresh.
        window.history.replaceState({}, document.title, '/set-password');
      } catch (err: any) {
        setError(err?.message || 'Could not initialize password setup session.');
      } finally {
        setInitializing(false);
      }
    };

    void establishSessionFromUrl();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess('Password updated successfully. You can continue to your dashboard.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Set your password</h1>
        <p className="text-sm text-gray-600 mt-2">
          Your email is confirmed. Choose a new password to secure your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-10 py-2.5"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-10 py-2.5"
                placeholder="Repeat your password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || initializing}
            className="w-full bg-primary text-white rounded-lg py-2.5 hover:opacity-90 disabled:opacity-60"
          >
            {initializing ? 'Preparing...' : loading ? 'Updating...' : 'Set Password'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          {success ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-primary hover:underline"
            >
              Continue to dashboard
            </button>
          ) : (
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
