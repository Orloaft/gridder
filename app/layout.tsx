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
    <html lang="en" className="bg-gray-900">
      <body className="antialiased bg-gray-900">{children}</body>
    </html>
  );
}
