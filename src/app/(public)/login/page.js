'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const handleDemoLogin = async () => {
    try {
      setError(null);
      setSubmitting(true);

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@rainmaker.com',
          displayName: 'Demo User',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to sign in.');
      }

      const profile = result.user;

      const name = profile.display_name ?? 'Demo User';

      login({
        id: profile.id,
        name,
        email: profile.email,
        role: profile.role,
        peerGroupId: profile.peer_group_id,
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('Demo login failed', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-purplebg">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
          Rainmaker Login
        </h1>
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2 text-white font-medium transition-colors hover:bg-action disabled:cursor-not-allowed disabled:bg-primary/60"
        >
          {submitting ? 'Signing in…' : 'Sign in with demo account'}
        </button>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}
