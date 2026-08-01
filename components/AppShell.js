'use client';


import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Icon from './Icon';
import { useVault } from '@/app/providers';

export default function AppShell({ children }) {
  const { saveError } = useVault();

  return (
    <div className="flex h-full w-full gap-6 p-4 md:p-8 lg:gap-8">
      <Sidebar />
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNav />
        {children}
      </main>

      {saveError ? (
        <div
          role="alert"
          className="anim-rise fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-500/40 bg-raised px-5 py-3 text-[13px] font-semibold text-red-300 shadow-2xl"
        >
          <Icon name="close-circle" size={18} />
          {saveError}
        </div>
      ) : null}
    </div>
  );
}

/** Shared page heading so every app in the workspace reads the same. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="mb-8 flex shrink-0 flex-wrap items-center justify-between gap-4 px-2 pt-2 md:px-0">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-[14px] text-soft">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}
