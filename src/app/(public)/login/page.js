'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useAuth } from '/lib/authContext';

const DEMO_USERS = [
  {
    role: 'normal',
    email: 'learner.demo@rainmaker.com',
    displayName: 'Learner Demo',
    label: 'Sign in as learner',
    description: 'Standard access to the core lesson catalogue.',
  },
  {
    role: 'enhanced',
    email: 'enhanced.demo@rainmaker.com',
    displayName: 'Enhanced Demo',
    label: 'Sign in as enhanced user',
    description: 'Includes enhanced-only lessons and previews.',
  },
  {
    role: 'admin',
    email: 'admin.demo@rainmaker.com',
    displayName: 'Admin Demo',
    label: 'Sign in as admin',
    description: 'Full administrative access for testing controls.',
  },
];

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState(null);
  const [error, setError] = useState(null);
  const [ssoPending, setSsoPending] = useState(false);
  const ssoEnabled = useMemo(() => process.env.NEXT_PUBLIC_AZURE_AD_SSO_ENABLED === 'true', []);
  const showDemoLogins = useMemo(() => process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true', []);

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const handleDemoLogin = async (preset) => {
    if (!preset) return;
    try {
      setError(null);
      setPendingRole(preset.role);

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: preset.email,
          displayName: preset.displayName,
          role: preset.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to sign in.');
      }

      const profile = result.user;
      const name = profile.display_name ?? preset.displayName;

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
      setPendingRole(null);
    }
  };

  if (loading) return null;

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-purplebg bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/images/rm-bg.jpg)' }}
    >
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
          Rainmaker Login
        </h1>
        {ssoEnabled ? (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setSsoPending(true);
                signIn('azure-ad', { callbackUrl: '/dashboard' }).catch((signInError) => {
                  console.error('Azure AD sign-in failed to start', signInError);
                  setError('Unable to start single sign-on. Please try again or use a demo login.');
                  setSsoPending(false);
                });
              }}
              disabled={ssoPending || Boolean(pendingRole)}
              className="flex w-full flex-col rounded-md border border-primary bg-white px-4 py-3 text-left text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-primary/40 disabled:text-primary/50"
            >
              <span className="text-sm font-semibold">
                {ssoPending ? 'Redirecting to Birketts SSO…' : 'Sign in with Birketts SSO'}
              </span>
              <span className="text-xs text-primary/70">Use your Microsoft 365 credentials.</span>
            </button>
          </div>
        ) : null}
        {showDemoLogins ? (
          <div className="space-y-3">
            {DEMO_USERS.map((preset) => {
              const isPending = pendingRole === preset.role;
              return (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => handleDemoLogin(preset)}
                  disabled={Boolean(pendingRole)}
                  className="flex w-full flex-col rounded-md bg-primary px-4 py-3 text-left text-white transition-colors hover:bg-action disabled:cursor-not-allowed disabled:bg-primary/60"
                >
                  <span className="text-sm font-semibold">
                    {isPending ? 'Signing in…' : preset.label}
                  </span>
                  <span className="text-xs text-white/80">{preset.description}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}
