import type { Metadata } from 'next';
import './globals.css';
import { Manrope } from 'next/font/google';
import Link from 'next/link';
import { StatusBarProvider } from '@/contexts/StatusBarContext';
import { StatusBar } from '@/components/StatusBar';
import { Navigation } from '../components/Navigation';

const font = Manrope({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'CRM',
  description: 'Leads',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={font.className}>
        <StatusBarProvider>
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
            <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
              <span className="text-xl font-bold text-gray-900">Fleexy</span>
              
              <Navigation />
              
              <div className="flex items-center gap-4 relative">
                <StatusBar />
                <button className="p-2 text-gray-500 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-3 py-4">
            {children}
          </main>
        </StatusBarProvider>
      </body>
    </html>
  );
}
