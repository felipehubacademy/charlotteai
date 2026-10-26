// Layout do /admin: metadados do app instalável (PWA "Queizy Gestão") + o painel (AdminShell, client).
import type { Metadata, Viewport } from 'next';
import AdminShell from './AdminShell';

export const metadata: Metadata = {
  title: 'Queizy Gestão',
  manifest: '/admin-pwa/manifest.json',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Queizy Gestão', statusBarStyle: 'black-translucent' },
  icons: { apple: '/admin-pwa/apple-touch-icon.png' },
};

export const viewport: Viewport = { themeColor: '#16131F' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
