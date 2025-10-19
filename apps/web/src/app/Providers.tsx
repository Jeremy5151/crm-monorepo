'use client';

import { ColumnsProvider } from '@/contexts/ColumnsContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <ColumnsProvider>{children}</ColumnsProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
