'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import { APPS } from './Sidebar';
import { useVault } from '@/app/providers';

export default function MobileNav() {
  const pathname = usePathname();
  const { exportBackup, lock } = useVault();

  return (
    <div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-panel border border-edge bg-surface p-2 md:hidden">
      {APPS.map(({ href, label, icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-[#1e1e1e] text-white' : 'text-soft'
            }`}
          >
            <Icon name={icon} size={18} />
            {label}
          </Link>
        );
      })}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button type="button" onClick={exportBackup} className="rounded-xl p-2 text-soft hover:text-white" title="Backup">
          <Icon name="export" size={18} />
        </button>
        <button type="button" onClick={lock} className="rounded-xl p-2 text-soft hover:text-red-400" title="Lock now">
          <Icon name="lock-keyhole" size={18} />
        </button>
      </div>
    </div>
  );
}
