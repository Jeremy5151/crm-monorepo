'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStatusBar } from '@/contexts/StatusBarContext';

export function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { progress } = useStatusBar();

  const navItems = [
    { href: '/', label: t('nav.leads') },
    { href: '/boxes', label: t('nav.boxes') },
    { href: '/brokers', label: t('nav.brokers') },
    { href: '/users', label: t('nav.users') },
    { href: '/settings', label: t('nav.settings') },
  ];

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <span className="logo-text">CRM</span>
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
        </div>
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
        </div>
      </div>
    </header>
  );
}
