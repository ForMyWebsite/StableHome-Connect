import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'StableHome Connect · A steadier tomorrow',
    template: '%s · StableHome Connect',
  },
  description:
    'Prevent eviction. Find assistance. Stay housed. A private workspace for housing resources, plans, and voluntary discussions.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#17324D' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
