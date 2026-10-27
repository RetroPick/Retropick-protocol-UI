'use client';

import { RiRocketLine, RiWaterPercentLine, RiCoinsLine } from 'react-icons/ri';
import { FiPlus } from 'react-icons/fi';
import Link from '@/components/product/safe-link';
import { usePathname } from '@/lib/next-compat';

// Mobile counterpart of the sidebar: the fixed left rail is desktop-only,
// so phones get a bottom bar with the same destinations plus Launch.
export function MobileNav() {
  const pathname = usePathname();
  const isActive = (id: 'home' | 'earn' | 'liquidity') => {
    if (id === 'liquidity') return pathname.startsWith('/liquidity');
    if (id === 'earn') return pathname.startsWith('/earn') || pathname.startsWith('/portfolio');
    return pathname.startsWith('/launchpad') || pathname.startsWith('/prism') || pathname.startsWith('/creator') || pathname === '/docs';
  };

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: RiRocketLine, href: '/launchpad' },
    { id: 'liquidity' as const, label: 'Liquidity', icon: RiWaterPercentLine, href: '/liquidity' },
    { id: 'earn' as const, label: 'Earn', icon: RiCoinsLine, href: '/earn' },
  ];

  return (
    <nav className="mnav" aria-label="Primary navigation">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const active = isActive(item.id);
        return (
          <Link key={item.id} href={item.href} aria-current={active ? 'page' : undefined} className={`mnav-item${active ? ' active' : ''}`}>
            <IconComponent className="w-5 h-5"/>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link href="/launchpad/create" className="mnav-item">
        <span className="mnav-launch-icon"><FiPlus className="w-4 h-4 stroke-[3]"/></span>
        <span>Launch</span>
      </Link>
    </nav>
  );
}
