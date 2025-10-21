'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { StatusBarProvider } from '@/contexts/StatusBarContext';
import { ColumnsProvider } from '@/contexts/ColumnsContext';
import { UserProvider } from '@/contexts/UserContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <TimezoneProvider>
            <StatusBarProvider>
              <ToastProvider>
                <ColumnsProvider>
                  {children}
                </ColumnsProvider>
              </ToastProvider>
            </StatusBarProvider>
          </TimezoneProvider>
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}