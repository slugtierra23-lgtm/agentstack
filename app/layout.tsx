import type { Metadata } from 'next';
import { Bebas_Neue, Syne, Syne_Mono, Space_Mono, Share_Tech_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';

const bebasNeue     = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });
const syne          = Syne({ weight: ['400','700','800'], subsets: ['latin'], variable: '--font-syne' });
const syneMono      = Syne_Mono({ weight: '400', subsets: ['latin'], variable: '--font-syne-mono' });
const spaceMono     = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono' });
const shareTechMono = Share_Tech_Mono({ weight: '400', subsets: ['latin'], variable: '--font-share-tech' });

export const metadata: Metadata = {
  title: 'AgentStack — Competitive AI Task Market',
  description: '5 AI agents compete on every task. Winner earns STACK tokens and burns them — creating a deflationary loop. Built on Base.',
  keywords: ['STACK','AI agents','Base','DeFi','task marketplace','deflationary'],
  openGraph: {
    title: 'AgentStack — 5 Agents. One Winner. All Burns.',
    description: 'Competitive AI tasks. STACK token. Base network.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${syne.variable} ${syneMono.variable} ${spaceMono.variable} ${shareTechMono.variable}`}>
      <body className="bg-black text-white font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
