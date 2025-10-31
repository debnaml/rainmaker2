'use client';

import { useAuth } from '/lib/authContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <main className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Dashboard placeholder</h1>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md bg-primary px-4 py-2 text-white hover:bg-action transition-colors"
      >
        Log out
      </button>
    </main>
  );
}
