import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { UserProfileProvider } from '@/lib/context/user-profile-context';

export const metadata: Metadata = {
  title: 'Kamu İlan - Resmî Gazete ve Kamu Personel Alım Platformu',
  description:
    'Türkiye genelindeki Resmî Gazete ve Kariyer Kapısı kamu personeli ve memur alım ilanlarını anlık takip edin, bölüm ve KPSS puanınıza göre otomatik eşleştirin.',
  openGraph: {
    title: 'Kamu İlan - Akıllı Kamu Personeli & Memur İlan Eşleştirme',
    description:
      'Resmî Gazete, Kariyer Kapısı ve ÖSYM alımlarını bölüm, KPSS, ALES ve YDS şartlarınıza göre anında karşılaştırın.',
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Kamu İlan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kamu İlan - Resmî Gazete ve Kariyer Kapısı İlanları',
    description: 'Bölümünüze ve KPSS puanınıza tam uyan kamu ilanlarını tek tıkla görün.',
  },
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
