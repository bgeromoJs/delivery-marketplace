import type { Metadata } from 'next';
import './globals.css';
import { HeaderNav } from '@/components/HeaderNav';

export const metadata: Metadata = {
  title: 'Delivery Marketplace Multi-tenant',
  description: 'Plataforma unificada com App Cliente, Vendedor, Entregador e Painel Admin',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 font-sans antialiased">
        <HeaderNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
