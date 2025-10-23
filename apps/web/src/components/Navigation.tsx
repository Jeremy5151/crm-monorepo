'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useUser } from '@/contexts/UserContext';
import { CurrentTime } from './CurrentTime';

export function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { timezone } = useTimezone();
  const { user } = useUser();

  // Определяем доступные пункты меню в зависимости от роли
  const allNavItems = [
    { href: '/', label: t('nav.leads'), roles: ['AFFILIATE', 'AFFILIATE_MASTER', 'ADMIN', 'SUPERADMIN'] },
    { href: '/boxes', label: t('nav.boxes'), roles: ['ADMIN', 'SUPERADMIN'] },
    { href: '/brokers', label: t('nav.brokers'), roles: ['ADMIN', 'SUPERADMIN'] },
    { href: '/users', label: t('nav.users'), roles: ['ADMIN', 'SUPERADMIN'] },
    { href: '/settings', label: t('nav.settings'), roles: ['ADMIN', 'SUPERADMIN'] },
    { href: '/logs', label: 'Logs', roles: ['ADMIN', 'SUPERADMIN'] },
  ];

  const navItems = user 
    ? allNavItems.filter(item => item.roles.includes(user.role))
    : allNavItems;

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
