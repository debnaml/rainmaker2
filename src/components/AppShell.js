'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '/lib/authContext';
import Header from './Header';

export default function AppShell({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="flex min-h-full flex-col bg-purplebg text-textdark">
      <Header user={user} />
      <div className="flex-1 pt-20">{children}</div>
    </div>
  );
}
