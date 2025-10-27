'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';
import { StatusBar } from './StatusBar';
import { useUser } from '@/contexts/UserContext';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const { user, loading } = useUser();

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
