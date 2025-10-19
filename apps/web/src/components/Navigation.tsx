'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export function Navigation() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/dashboard', label: t('nav.dashboard') },
    { href: '/', label: t('nav.leads') },
    { href: '/boxes', label: t('nav.boxes') },
    { href: '/brokers', label: t('nav.brokers') },
    { href: '/users', label: t('nav.users') },
    { href: '/settings', label: t('nav.settings') },
  ];

  return (
    <nav className="flex gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              isActive
                ? 'text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
