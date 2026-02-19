'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

const NAV = [
  { href: '/market',             label: 'MARKET'     },
  { href: '/agents',             label: 'AGENTS'     },
  { href: '/dashboard',          label: 'DASHBOARD'  },
  { href: '/dashboard/rankings', label: 'RANKINGS'   },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      <nav className={cn('fixed top-0 left-0 right-0 z-50 border-b transition-all duration-200',
        scrolled ? 'border-acid/30 bg-black/98' : 'border-acid/15 bg-black/95')}
        style={{ backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 h-14 gap-4">
          <Link href="/" className="font-display text-2xl tracking-wider text-acid hover:text-white transition-colors shrink-0">
            AGENTSTACK
          </Link>
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href}
                className={cn('font-display text-sm tracking-widest px-4 py-2 transition-all',
                  pathname.startsWith(href) ? 'text-acid border border-acid/30 bg-acid/5' : 'text-muted hover:text-white')}>
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ConnectButton label="CONNECT" showBalance={false} chainStatus="none" accountStatus="address" />
            <button className="md:hidden text-muted hover:text-white p-1" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>
      </nav>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden pt-14" style={{ background: 'rgba(6,6,8,0.97)' }}>
          <div className="flex flex-col border-t border-acid/15">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href}
                className={cn('font-display text-lg tracking-widest px-6 py-5 border-b border-acid/10 transition-colors',
                  pathname.startsWith(href) ? 'text-acid bg-acid/5' : 'text-muted hover:text-white')}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
