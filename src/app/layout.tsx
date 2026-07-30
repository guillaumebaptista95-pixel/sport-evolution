// Racine : metadonnees PWA et zones sures iOS/Android.
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sport Evolution',
  description: 'Ton carnet de musculation intelligent : seances, progression et records.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sport Evolution',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#07080B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
