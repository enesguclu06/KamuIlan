import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { UserProfileProvider } from '@/lib/context/user-profile-context';

export const metadata: Metadata = {
  title: 'Kamu İlan - Resmî Gazete ve Kamu Personel Alım Platformu',
  description: 'Türkiye genelindeki Resmî Gazete ve Kariyer Kapısı kamu personeli ve memur alım ilanlarını anlık takip edin, bölüm ve KPSS puanınıza göre eşleştirin.',
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
