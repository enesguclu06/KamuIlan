import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { UserProfileProvider } from '@/lib/context/user-profile-context';

export const metadata: Metadata = {
  title: 'Kamuİlan AI - Akıllı Kamu & Memur Personel Alım Takip Platformu',
  description: 'Resmî Gazete ve Kariyer Kapısı ilanlarını yapay zeka ile analiz eden ve profilinize göre Uygun / Belki / Uymuyor eşleştirmesi yapan akıllı platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <UserProfileProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </UserProfileProvider>
      </body>
    </html>
  );
}
