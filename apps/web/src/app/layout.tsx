import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM',
  description: 'Leads',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-7xl px-3 py-4">
          {children}
        </main>
      </body>
    </html>
  );
}