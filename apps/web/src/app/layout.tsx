import type { Metadata } from 'next';
import Providers from './Providers';
import { Navigation } from '@/components/Navigation';
import { StatusBar } from '@/components/StatusBar';

export const metadata: Metadata = {
  title: 'CRM',
  description: 'Leads',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/custom.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <Providers>
          <div className="app-layout">
            <Navigation />
            <main className="main-content">
              {children}
            </main>
            <StatusBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}