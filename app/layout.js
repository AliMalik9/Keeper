import './globals.css';
import { VaultProvider } from './providers';
import LockGate from '@/components/LockGate';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'KEEP — Workspace',
  description: 'Encrypted notes, a priority board and a 24-hour day planner in one local-first workspace.',
};

export const viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen w-full overflow-hidden antialiased">
        <VaultProvider>
          <LockGate>
            <AppShell>{children}</AppShell>
          </LockGate>
        </VaultProvider>
      </body>
    </html>
  );
}
