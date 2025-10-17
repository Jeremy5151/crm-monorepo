'use client';

import { ColumnsProvider } from '@/contexts/ColumnsContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ColumnsProvider>{children}</ColumnsProvider>;
}
