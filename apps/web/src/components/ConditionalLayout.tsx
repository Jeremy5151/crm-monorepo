'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';
import { StatusBar } from './StatusBar';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
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
