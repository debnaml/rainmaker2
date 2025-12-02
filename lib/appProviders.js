'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from './authContext';

export default function AppProviders({ children }) {
  return (
    <SessionProvider>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  );
}
