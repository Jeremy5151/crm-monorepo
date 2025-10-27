'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { useUser } from '@/contexts/UserContext';
import { CurrentTime } from './CurrentTime';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { timezone } = useTimezone();
  const { user } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Определяем доступные пункты меню в зависимости от роли
  const allNavItems = [
    { href: '/', label: t('nav.leads'), roles: ['AFFILIATE', 'AFFILIATE_MASTER', 'ADMIN', 'SUPERADMIN'] },
    { href: '/boxes', label: t('nav.boxes'), roles: ['ADMIN', 'SUPERADMIN'] },
    { href: '/brokers', label: t('nav.brokers'), roles: ['ADMIN', 'SUPERADMIN'] },
    { href: '/users', label: t('nav.users'), roles: ['ADMIN', 'SUPERADMIN'] },
    { href: '/settings', label: t('nav.settings'), roles: ['AFFILIATE', 'AFFILIATE_MASTER', 'ADMIN', 'SUPERADMIN'] }, // Settings доступны всем
    { href: '/logs', label: 'Logs', roles: ['ADMIN', 'SUPERADMIN'] },
  ];

  // Показываем только базовые пункты до загрузки пользователя
  const navItems = user 
    ? allNavItems.filter(item => item.roles.includes(user.role))
    : [{ href: '/', label: t('nav.leads') }]; // Показываем только Leads до загрузки

  // Закрывать меню при клике снаружи
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = () => {
    // TODO: Clear auth tokens and redirect to login
    localStorage.removeItem('apiToken');
    router.push('/login');
  };

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
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="user-icon hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
