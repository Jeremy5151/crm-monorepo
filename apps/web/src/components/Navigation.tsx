'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { CurrentTime } from './CurrentTime';

export function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { progress } = useStatusBar();
  const { timezone } = useTimezone();

  const navItems = [
    { href: '/', label: t('nav.leads') },
    { href: '/boxes', label: t('nav.boxes') },
    { href: '/brokers', label: t('nav.brokers') },
    { href: '/users', label: t('nav.users') },
    { href: '/settings', label: t('nav.settings') },
  ];

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">
              <span className="logo-text">Fleexy</span>
            </div>
            <div className="header-time">
              <CurrentTime timezone={timezone} />
            </div>
          </div>
          
          <nav className="header-nav">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="header-right">
            <div className="header-status">
              <span className="status-text">
                {progress.filter(p => p.status === 'success' || p.status === 'error').length}/{progress.length}
              </span>
              <div className="status-dots">
                <div className="status-dot"></div>
                <div className="status-dot"></div>
              </div>
            </div>
            <button className="user-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
