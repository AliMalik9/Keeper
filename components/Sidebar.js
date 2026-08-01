'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import Icon from '@/components/Icon';
import { useVault } from '@/app/providers';

export const APPS = [
  { href: '/notes', label: 'Notes', icon: 'notes-minimalistic' },
  { href: '/board', label: 'Kanban Board', icon: 'widget-4' },
  { href: '/planner', label: 'WisePlanner', icon: 'clock-circle' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { exportBackup, lock } = useVault();
  const backupRef = useRef(null);

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col rounded-panel border border-edge bg-surface p-3 md:flex">
      <div className="mb-3 flex items-center gap-3 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-edgeStrong bg-[#1e1e1e] text-white">
          <Icon name="lightbulb-bolt" size={18} />
        </div>
        <span className="text-[19px] font-semibold tracking-tight text-white">KEEP</span>
      </div>

      <nav className="space-y-1.5">
        {APPS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                active
                  ? 'border-edge bg-[#1e1e1e] text-white'
                  : 'border-transparent text-soft hover:bg-[#1e1e1e] hover:text-white'
              }`}
            >
              <Icon name={icon} size={20} />
              <span className="truncate text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1.5 border-t border-edge pt-3">
        <div className="group relative">
          <button
            ref={backupRef}
            type="button"
            onClick={exportBackup}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-soft transition-colors hover:bg-[#1e1e1e] hover:text-white"
          >
            <Icon name="export" size={20} />
            <span className="text-sm font-medium">Backup</span>
          </button>
          <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-60 rounded-xl border border-edgeStrong bg-raised p-3 text-[13px] leading-relaxed text-neutral-300 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100">
            Download a secure <b className="text-white">.keep</b> file containing your notes, board and planner. Import it on
            any other device.
          </div>
        </div>

        <button
          type="button"
          onClick={lock}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-soft transition-colors hover:bg-[#1e1e1e] hover:text-red-400"
        >
          <Icon name="lock-keyhole" size={20} />
          <span className="text-sm font-medium">Lock now</span>
        </button>
      </div>
    </aside>
  );
}
