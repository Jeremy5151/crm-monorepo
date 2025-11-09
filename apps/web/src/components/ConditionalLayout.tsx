'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navigation } from './Navigation';
import { StatusBar } from './StatusBar';
import { useUser } from '@/contexts/UserContext';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.replace('/login');
    }
  }, [isLoginPage, loading, router, user]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Не показываем навигацию пока загружается пользователь
  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Navigation />
      <main className="main-content">
        {children}
      </main>
      <StatusBar />
    </div>
  );
}
