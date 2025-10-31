'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  if (loading) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-purplebg">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-primary mb-6">
          Rainmaker Login
        </h1>
        <button
          type="button"
          onClick={() => login({ name: 'Demo User', email: 'demo@rainmaker.com' })}
          className="w-full rounded-md bg-primary px-4 py-2 text-white font-medium hover:bg-action transition-colors"
        >
          Sign in with demo account
        </button>
      </div>
    </main>
  );
}
