'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Дашборд' },
    { href: '/', label: 'Лиды' },
    { href: '/boxes', label: 'Боксы' },
    { href: '/brokers', label: 'Интеграции' },
    { href: '/apikeys', label: 'Пользователи' },
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
                ? 'text-white bg-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
