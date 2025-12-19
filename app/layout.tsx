import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gridder',
  description: 'A grid-based autobattler RPG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
