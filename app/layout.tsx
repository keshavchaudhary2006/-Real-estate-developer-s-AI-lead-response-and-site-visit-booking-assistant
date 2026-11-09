import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keshav | Real Estate Lead & Booking Engine',
  description: 'Fullstack Next.js and Node.js backend with PostgreSQL schema, phone deduplication, and slot booking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
