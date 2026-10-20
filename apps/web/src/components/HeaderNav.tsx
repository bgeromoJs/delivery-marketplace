'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, ShoppingBag, Bike, ShieldCheck, Home } from 'lucide-react';

export function HeaderNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Início', icon: Home },
    { href: '/loja/pizzaria-do-joao', label: 'App Cliente', icon: ShoppingBag, match: '/loja' },
    { href: '/vendedor', label: 'Painel Vendedor', icon: Store, match: '/vendedor' },
    { href: '/entregador', label: 'App Entregador', icon: Bike, match: '/entregador' },
    { href: '/admin', label: 'Painel Admin', icon: ShieldCheck, match: '/admin' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 tracking-tight">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-sm">
              🚀
            </span>
            <span>Delivery<span className="text-rose-600">Hub</span></span>
          </Link>

          {/* Role switcher pills */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.match
                ? pathname.startsWith(item.match)
                : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
