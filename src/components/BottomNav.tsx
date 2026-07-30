'use client';

// Barre de navigation basse avec indicateur anime.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart3, Dumbbell, Home, Library, User } from 'lucide-react';
import { cn } from '@/lib/format';

const ITEMS = [
  { href: '/', label: 'Accueil', Icon: Home },
  { href: '/exercices', label: 'Exercices', Icon: Library },
  { href: '/seance', label: 'Seance', Icon: Dumbbell, primary: true },
  { href: '/stats', label: 'Stats', Icon: BarChart3 },
  { href: '/profil', label: 'Profil', Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-ink-950/80 backdrop-blur-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-[66px] w-full max-w-[560px] items-stretch justify-around px-2">
        {ITEMS.map(({ href, label, Icon, primary }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="press relative -mt-5 flex w-[62px] flex-col items-center justify-start"
              >
                <span className="grid h-[54px] w-[54px] place-items-center rounded-[20px] bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
                  <Icon size={23} strokeWidth={2.2} className="text-white" />
                </span>
                <span className="mt-1 text-[10px] font-semibold text-ink-300">{label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="press relative flex flex-1 flex-col items-center justify-center gap-1 pt-1"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  className="absolute inset-x-3 top-1.5 h-[38px] rounded-2xl bg-white/[0.07]"
                />
              )}
              <Icon
                size={21}
                strokeWidth={active ? 2.4 : 1.9}
                className={cn('relative z-10 transition-colors', active ? 'text-white' : 'text-ink-400')}
              />
              <span
                className={cn(
                  'relative z-10 text-[10px] font-semibold transition-colors',
                  active ? 'text-white' : 'text-ink-400'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
